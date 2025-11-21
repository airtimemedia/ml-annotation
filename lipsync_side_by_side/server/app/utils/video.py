"""Video processing utilities for downloading, re-encoding, and caching videos."""

import hashlib
import logging
import os
import shutil
import subprocess
import tempfile
import urllib.request
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from app.constants import VIDEO_CACHE_DIR_NAME

logger = logging.getLogger(__name__)


class VideoProcessingError(Exception):
    """Raised when video processing fails."""
    pass


def download_video(video_url: str) -> str:
    """
    Download a video from a URL to a temporary file.
    Supports both S3 (with boto3) and regular HTTP URLs.

    Args:
        video_url: URL to video file

    Returns:
        Path to downloaded temporary file

    Raises:
        VideoProcessingError: If download fails
    """
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_video:
            video_path = tmp_video.name

        logger.info(f"Downloading video from {video_url}")

        # Check if it's an S3 URL
        parsed = urlparse(video_url)
        if parsed.hostname and 's3' in parsed.hostname:
            # Try boto3 with credentials, then unsigned, then urllib
            try:
                import boto3
                from botocore.config import Config
                from botocore.exceptions import ClientError, NoCredentialsError

                # Parse S3 URL (format: https://bucket.s3.region.amazonaws.com/key)
                hostname_parts = parsed.hostname.split('.')
                bucket = hostname_parts[0]

                # Extract region if present in URL (e.g., s3.us-east-2.amazonaws.com)
                region = None
                if len(hostname_parts) > 2 and hostname_parts[1] == 's3':
                    # Format: bucket.s3.region.amazonaws.com
                    region = hostname_parts[2]
                elif len(hostname_parts) > 1 and hostname_parts[1] != 's3':
                    # Format: bucket.s3-region.amazonaws.com
                    if hostname_parts[1].startswith('s3-'):
                        region = hostname_parts[1][3:]

                key = parsed.path.lstrip('/')

                logger.info(f"Downloading from S3: bucket={bucket}, region={region}, key={key}")

                # Try with credentials first (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY from env)
                try:
                    if region:
                        s3_client = boto3.client('s3', region_name=region)
                    else:
                        s3_client = boto3.client('s3')

                    s3_client.download_file(bucket, key, video_path)
                    logger.info("Downloaded using boto3 (with credentials)")

                except (NoCredentialsError, ClientError) as cred_error:
                    logger.info(f"Credentials failed ({cred_error}), trying unsigned")
                    # Fall back to unsigned requests for public buckets
                    from botocore import UNSIGNED
                    config = Config(signature_version=UNSIGNED)
                    if region:
                        s3_client = boto3.client('s3', region_name=region, config=config)
                    else:
                        s3_client = boto3.client('s3', config=config)

                    s3_client.download_file(bucket, key, video_path)
                    logger.info("Downloaded using boto3 (unsigned)")

            except (ImportError, Exception) as e:
                logger.info(f"boto3 failed ({e}), falling back to urllib")
                urllib.request.urlretrieve(video_url, video_path)
        else:
            # Regular HTTP/HTTPS URL
            urllib.request.urlretrieve(video_url, video_path)

        file_size = os.path.getsize(video_path)
        logger.info(f"Downloaded {file_size:,} bytes")

        return video_path
    except Exception as e:
        logger.error(f"Failed to download video from {video_url}: {e}")
        raise VideoProcessingError(f"Download failed: {e}") from e


def get_cache_dir() -> Path:
    """Get or create the video cache directory."""
    cache_dir = Path(tempfile.gettempdir()) / VIDEO_CACHE_DIR_NAME
    cache_dir.mkdir(exist_ok=True)
    return cache_dir


def _get_video_cache_path(video_url: str) -> Path:
    cache_dir = get_cache_dir()
    url_hash = hashlib.md5(video_url.encode()).hexdigest()
    return cache_dir / f"{url_hash}.mp4"


def process_video_from_url(video_url: str, force_reencode: bool = False) -> tuple[str, str]:
    cache_path = _get_video_cache_path(video_url)

    if cache_path.exists():
        logger.info(f"Using cached video: {cache_path}")
        return str(cache_path), str(cache_path)

    logger.info(f"Downloading video from {video_url}")

    downloaded_path = None
    try:
        downloaded_path = download_video(video_url)
        logger.info(f"Caching video to: {cache_path}")
        shutil.copy2(downloaded_path, cache_path)
        logger.info(f"Video cached at: {cache_path}")
        return str(cache_path), str(cache_path)

    except Exception as e:
        logger.error(f"Failed to process video: {e}")
        raise VideoProcessingError(f"Video processing failed: {e}") from e

    finally:
        if downloaded_path and os.path.exists(downloaded_path):
            os.unlink(downloaded_path)


def clear_video_cache() -> None:
    """
    Clear all cached processed videos.

    Removes the entire video cache directory and all its contents.
    """
    cache_dir = get_cache_dir()
    if cache_dir.exists():
        shutil.rmtree(cache_dir)
        logger.info(f"Cleared video cache: {cache_dir}")
