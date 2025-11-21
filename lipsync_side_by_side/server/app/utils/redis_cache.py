"""Redis caching for video storage."""

import hashlib
import logging
import os
import time
from typing import Optional

import redis

logger = logging.getLogger(__name__)

_redis_client: Optional[redis.Redis] = None
VIDEO_TTL = 900  # 15 minutes
URL_MAPPING_TTL = 86400  # 24 hours
MAX_CACHED_VIDEOS = 2


def get_redis_client() -> redis.Redis:
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        redis_url = os.environ.get("REDIS_URL")
        if not redis_url:
            raise RuntimeError("REDIS_URL environment variable not set")
        _redis_client = redis.from_url(redis_url, decode_responses=False)
        logger.info("Redis client initialized")
    return _redis_client


def _get_video_key(video_url: str) -> str:
    """Generate Redis key from video URL."""
    return f"video:{hashlib.md5(video_url.encode()).hexdigest()}"


def _evict_old_videos(client: redis.Redis):
    """Keep only the most recent videos in cache."""
    video_count = client.zcard("video:access_times")
    if video_count > MAX_CACHED_VIDEOS:
        oldest_keys = client.zrange("video:access_times", 0, video_count - MAX_CACHED_VIDEOS - 1)
        for old_key in oldest_keys:
            client.delete(old_key)
            client.zrem("video:access_times", old_key)
            key_str = old_key.decode() if isinstance(old_key, bytes) else old_key
            logger.info(f"Evicted: {key_str}")


def cache_video(video_url: str, video_data: bytes, ttl: int = VIDEO_TTL) -> str:
    """Cache video in Redis with automatic eviction of old entries."""
    client = get_redis_client()
    video_key = _get_video_key(video_url)

    client.setex(video_key, ttl, video_data)
    client.setex(f"{video_key}:url", URL_MAPPING_TTL, video_url)
    client.zadd("video:access_times", {video_key: time.time()})
    client.expire("video:access_times", ttl)

    _evict_old_videos(client)
    logger.info(f"Cached: {video_key} ({len(video_data):,} bytes, expires in {ttl}s)")

    return video_key


def get_cached_video(video_url: str) -> Optional[bytes]:
    """Get video from cache by URL."""
    try:
        client = get_redis_client()
        video_key = _get_video_key(video_url)
        video_data = client.get(video_key)

        if video_data:
            client.zadd("video:access_times", {video_key: time.time()})
            logger.info(f"Cache hit: {video_key}")
            return video_data

        logger.info(f"Cache miss: {video_key}")
        return None

    except Exception as e:
        logger.error(f"Failed to get cached video: {e}")
        return None


def get_cached_video_by_key(video_key: str) -> Optional[bytes]:
    """Get video from cache by Redis key."""
    try:
        client = get_redis_client()
        video_data = client.get(video_key)

        if not video_data:
            return None

        if len(video_data) < 100:
            logger.error(f"Video data too small: {len(video_data)} bytes")
            return None

        logger.info(f"Retrieved: {video_key} ({len(video_data):,} bytes)")
        return video_data

    except Exception as e:
        logger.error(f"Failed to get video by key: {e}")
        return None


def get_video_url_by_key(video_key: str) -> Optional[str]:
    """Get original video URL from Redis key."""
    try:
        client = get_redis_client()
        video_url = client.get(f"{video_key}:url")

        if video_url:
            if isinstance(video_url, bytes):
                video_url = video_url.decode('utf-8')
            logger.info(f"URL mapping found: {video_key} -> {video_url}")
            return video_url

        logger.warning(f"No URL mapping for: {video_key}")
        return None

    except Exception as e:
        logger.error(f"Failed to get URL mapping: {e}")
        return None


def clear_video_cache() -> None:
    """Clear all cached videos."""
    try:
        client = get_redis_client()
        video_keys = client.zrange("video:access_times", 0, -1)

        for video_key in video_keys:
            client.delete(video_key)

        client.delete("video:access_times")
        logger.info(f"Cleared {len(video_keys)} videos from cache")

    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
