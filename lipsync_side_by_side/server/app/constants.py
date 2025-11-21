"""
Application Constants
Centralized configuration values for the video comparison backend
"""

# =============================================================================
# Server Configuration
# =============================================================================

ENV_PATH_PARENT_LEVELS = 3  # Parent directory levels to find .env file
DEFAULT_SERVER_PORT = 8081
SERVER_HOST = "0.0.0.0"
ENV_DEVELOPMENT = "development"

# Security (WARNING: Change these in production!)
DEFAULT_SECRET_KEY = "dev-secret-key-change-in-prod"

# File Upload
MAX_UPLOAD_SIZE_MB = 100
MAX_CONTENT_LENGTH = MAX_UPLOAD_SIZE_MB * 1024 * 1024  # 100MB in bytes

# =============================================================================
# CORS Configuration
# =============================================================================

# WARNING: Change for production - "*" allows all origins
CORS_ALLOWED_ORIGINS = "*"
CORS_ALLOWED_HEADERS = [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
]
CORS_ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

# =============================================================================
# Speech-to-Text (STT) Configuration
# =============================================================================

DEFAULT_STT_MODEL = "scribe_v1"
ENABLE_DIARIZATION = False

# =============================================================================
# Video Processing Configuration
# =============================================================================

# Cache
VIDEO_CACHE_DIR_NAME = "video_compare_cache"

# Note: FFmpeg-related constants removed - not used on Vercel
# Video processing is minimal (download from S3, cache in Redis)
# Waveforms generated client-side, transcription via ElevenLabs API

# =============================================================================
