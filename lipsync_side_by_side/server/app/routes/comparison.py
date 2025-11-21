"""Video processing API for comparison tool."""

import hashlib
import logging
import os
import tempfile
from flask import Blueprint, jsonify, request

from app.utils.video import download_video
from app.utils.redis_cache import get_cached_video, cache_video
from app.routes.transcription import transcribe_video_from_file

logger = logging.getLogger(__name__)
comparison_bp = Blueprint("comparison", __name__)


def _get_video_key(video_url):
    """Generate Redis key from video URL."""
    return f"video:{hashlib.md5(video_url.encode()).hexdigest()}"


def _process_cached_video(video_url, cached_video, skip_processing):
    """Process video that's already in cache."""
    video_key = _get_video_key(video_url)
    logger.info(f"Cache hit for {video_url} ({len(cached_video):,} bytes)")

    if skip_processing:
        return jsonify({"video_url": f"/api/video/serve/{video_key}"}), 200

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(cached_video)
        temp_path = tmp.name

    try:
        transcript = transcribe_video_from_file(temp_path)
        return jsonify({
            "video_url": f"/api/video/serve/{video_key}",
            "waveform": [],
            "transcript": transcript
        }), 200
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def _download_and_cache_video(video_url):
    """Download video from S3 and cache in Redis."""
    logger.info(f"Downloading video: {video_url}")
    temp_path = download_video(video_url)

    with open(temp_path, 'rb') as f:
        video_data = f.read()

    logger.info(f"Downloaded {len(video_data):,} bytes (signature: {video_data[:8].hex()})")
    video_key = cache_video(video_url, video_data)

    return video_key, temp_path, video_data


@comparison_bp.route("/process-video", methods=["POST"])
def process_single_video():
    """
    Process single video with optional transcription.

    Fast mode (skip_processing=true): Cache and return URL
    Full mode (skip_processing=false): Cache, transcribe, return URL + transcript
    """
    temp_path = None

    try:
        data = request.get_json()
        if not data or "video_url" not in data:
            return jsonify({"error": "video_url is required"}), 400

        video_url = data["video_url"]
        skip_processing = data.get("skip_processing", False)
        logger.info(f"Processing {video_url} (skip={skip_processing})")

        cached_video = get_cached_video(video_url)
        if cached_video:
            return _process_cached_video(video_url, cached_video, skip_processing)

        video_key, temp_path, video_data = _download_and_cache_video(video_url)

        if skip_processing:
            return jsonify({"video_url": f"/api/video/serve/{video_key}"}), 200

        transcript = transcribe_video_from_file(temp_path)
        return jsonify({
            "video_url": f"/api/video/serve/{video_key}",
            "waveform": [],
            "transcript": transcript
        }), 200

    except Exception as e:
        logger.error(f"Video processing failed: {e}", exc_info=True)
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Failed to clean up {temp_path}: {e}")
