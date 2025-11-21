import logging
import os
import tempfile
from pathlib import Path
from typing import Dict, List, Optional

import requests
from elevenlabs import ElevenLabs

from app.constants import DEFAULT_STT_MODEL, ENABLE_DIARIZATION

logger = logging.getLogger(__name__)


class STTService:
    """Service for speech-to-text transcription using ElevenLabs API."""

    def __init__(self):
        """Initialize the STT service with ElevenLabs client."""
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise ValueError(
                "ELEVENLABS_API_KEY not found in environment variables. "
                "Please set it using: export ELEVENLABS_API_KEY='your_api_key_here'"
            )
        self.client = ElevenLabs(api_key=api_key)

    def transcribe_audio(
        self,
        audio_file_path: str,
        model_id: str = DEFAULT_STT_MODEL,
        language_code: Optional[str] = None,
    ) -> Dict:
        """
        Transcribe an audio file to text with word-level timestamps.

        Args:
            audio_file_path: Path to audio file
            model_id: Model to use for transcription (default: scribe_v1)
            language_code: Optional language code (e.g., "en")

        Returns:
            dict: Transcription result with text and word timestamps
                {
                    "text": "full transcript",
                    "words": [
                        {
                            "text": "word",
                            "start": 0.0,
                            "end": 0.5
                        },
                        ...
                    ],
                    "language_code": "en",
                    "language_probability": 0.99
                }
        """
        audio_path = Path(audio_file_path)

        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")

        # Open and transcribe the audio file using ElevenLabs REST API directly
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY not found")

        with open(audio_path, "rb") as f:
            files = {
                "file": (audio_path.name, f, "audio/mpeg")
            }
            data = {
                "model_id": model_id,
                "diarize": "true" if ENABLE_DIARIZATION else "false",
            }
            if language_code:
                data["language_code"] = language_code

            logger.info(f"Calling ElevenLabs transcription API for {audio_path.name}")
            response = requests.post(
                "https://api.elevenlabs.io/v1/speech-to-text",
                headers={"xi-api-key": api_key},
                files=files,
                data=data,
                timeout=60
            )
            response.raise_for_status()
            result = response.json()

        # Extract text and metadata from API response
        transcript_data = {
            "text": result.get("text", ""),
            "language_code": result.get("language_code"),
            "language_probability": result.get("language_probability"),
            "words": [],
        }

        # Add word-level timestamps if available
        if "words" in result and result["words"]:
            transcript_data["words"] = [
                {
                    "text": word.get("text", ""),
                    "start": word.get("start", 0),
                    "end": word.get("end", 0),
                }
                for word in result["words"]
            ]

        logger.info(f"Transcription complete: {len(transcript_data['text'])} chars, {len(transcript_data['words'])} words")
        return transcript_data
