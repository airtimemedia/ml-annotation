"""Video serving and cache management endpoints."""

import os
import logging
from flask import Blueprint, Response, request, jsonify

from app.utils.redis_cache import (
    get_cached_video_by_key,
    get_video_url_by_key,
    cache_video,
    clear_video_cache
)
from app.utils.video import download_video

logger = logging.getLogger(__name__)
video_bp = Blueprint("video", __name__)


def _redownload_video(video_key):
    """Re-download video from S3 if cache expired."""
    video_url = get_video_url_by_key(video_key)
    if not video_url:
        return None

    logger.info(f"Re-downloading expired video: {video_url}")
    temp_path = download_video(video_url)

    with open(temp_path, 'rb') as f:
        video_data = f.read()

    if os.path.exists(temp_path):
        os.unlink(temp_path)

    cache_video(video_url, video_data)
    logger.info(f"Re-cached video: {video_key} ({len(video_data):,} bytes)")
    return video_data


def _parse_range_header(range_header, file_size):
    """Parse HTTP Range header and return (start, end) byte positions."""
    byte_range = range_header.replace('bytes=', '').split('-')
    start = int(byte_range[0]) if byte_range[0] else 0
    end = int(byte_range[1]) if byte_range[1] else file_size - 1
    return start, end


def _create_full_response(video_data):
    """Create 200 OK response with full video."""
    return Response(
        video_data,
        mimetype="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(len(video_data))
        }
    )


def _create_partial_response(video_data, start, end):
    """Create 206 Partial Content response."""
    file_size = len(video_data)
    chunk = video_data[start:end + 1]

    return Response(
        chunk,
        status=206,
        mimetype="video/mp4",
        headers={
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(len(chunk))
        }
    )


@video_bp.route("/serve/<video_key>", methods=["GET"])
def serve_video(video_key):
    """Serve video with HTTP Range request support for seeking."""
    try:
        logger.info(f"Serving video: {video_key} (Range: {request.headers.get('Range', 'None')})")

        video_data = get_cached_video_by_key(video_key)
        if not video_data:
            logger.warning(f"Cache miss for {video_key}, re-downloading")
            video_data = _redownload_video(video_key)
            if not video_data:
                return jsonify({"error": "Video not found"}), 404

        logger.info(f"Video ready: {len(video_data):,} bytes (signature: {video_data[:8].hex()})")

        range_header = request.headers.get('Range')
        if not range_header:
            logger.info(f"Returning full video (200)")
            return _create_full_response(video_data)

        start, end = _parse_range_header(range_header, len(video_data))
        if start >= len(video_data) or end >= len(video_data):
            return Response(status=416, headers={"Content-Range": f"bytes */{len(video_data)}"})

        logger.info(f"Returning range (206): {start}-{end}/{len(video_data)}")
        return _create_partial_response(video_data, start, end)

    except Exception as e:
        logger.error(f"Failed to serve video: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@video_bp.route("/clear-cache", methods=["POST"])
def clear_cache():
    """Clear all cached videos from Redis."""
    try:
        clear_video_cache()
        logger.info("Video cache cleared")
        return jsonify({"message": "Video cache cleared successfully"}), 200
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        return jsonify({"error": f"Failed to clear cache: {str(e)}"}), 500
