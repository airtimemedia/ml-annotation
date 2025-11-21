"""Speech-to-text transcription utilities."""

import logging

from app.services.stt import STTService
from app.utils.audio import NoAudioStreamError

logger = logging.getLogger(__name__)


def transcribe_video_from_file(video_path, language_code=None):
    """
    Transcribe a local video file (no download needed). Returns transcript data or None.

    Args:
        video_path: Local path to video file
        language_code: Optional language code

    Returns:
        dict with transcript data or None
    """
    try:
        # ElevenLabs API accepts video files directly - no need for ffmpeg!
        logger.info(f"Transcribing video file directly: {video_path}")
        stt_service = STTService()
        result = stt_service.transcribe_audio(video_path, language_code=language_code)
        return result

    except NoAudioStreamError:
        return None  # No audio is acceptable
    except Exception as e:
        logger.error(f"Transcription failed for {video_path}: {e}", exc_info=True)
        return None
