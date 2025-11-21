"""Application constants"""
import os

# Environment
ENV_DEVELOPMENT = "development"
ENV_PRODUCTION = "production"

# Server configuration
SERVER_HOST = "0.0.0.0"
DEFAULT_SERVER_PORT = 5002
DEFAULT_SECRET_KEY = "dev-secret-key-change-in-production"

# Path configuration
ENV_PATH_PARENT_LEVELS = 3  # From app/main.py to ml-annotation directory (parent of tts_side_by_side)

# Request configuration
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB max file size

# CORS configuration
CORS_ALLOWED_ORIGINS = "*"  # Allow all origins for development
CORS_ALLOWED_HEADERS = ["Content-Type", "Authorization"]
CORS_ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

# Audio configuration
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac", ".ogg"}
MAX_AUDIO_DURATION_SECONDS = 60  # Maximum audio duration for reference files
