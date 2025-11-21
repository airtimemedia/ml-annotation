"""Audio extraction utilities for video processing.

NOTE: This module is deprecated and not used on Vercel (no FFmpeg).
- Transcription is done via ElevenLabs API (video files directly)
- Waveforms are generated client-side in the browser
- Only NoAudioStreamError is used for compatibility
"""

import logging

logger = logging.getLogger(__name__)


class AudioExtractionError(Exception):
    """Raised when audio extraction fails."""
    pass


class NoAudioStreamError(AudioExtractionError):
    """Raised when video has no audio stream."""
    pass
