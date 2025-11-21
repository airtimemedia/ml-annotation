"""
Checkpoint Service for deployed TTS models (Haitong, Zbigniew, Julian)
"""
import os
import requests
import base64
import tempfile
from typing import Dict


class CheckpointService:
    def __init__(self):
        self.api_url = os.getenv("CHECKPOINT_API_URL", "http://localhost:8000")
        print(f"[CheckpointService] Initialized with API URL: {self.api_url}")

    def clone_voice(self, audio_file_path: str, model: str) -> dict:
        """Clone voice using checkpoint API"""
        print(f"[CheckpointService] Cloning voice for model: {model}")
        print(f"[CheckpointService] Audio file: {audio_file_path}")

        # Read and encode audio file
        with open(audio_file_path, 'rb') as f:
            wav_data = f.read()
            wav_base64 = base64.b64encode(wav_data).decode('utf-8')

        print(f"[CheckpointService] Encoded audio, size: {len(wav_base64)} bytes")

        # Call checkpoint API
        try:
            response = requests.post(
                f"{self.api_url}/clone_speaker",
                json={
                    "wav_base64": wav_base64,
                    "checkpoint": model
                },
                timeout=120
            )
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"[CheckpointService] Clone request failed: {e}")
            raise

        data = response.json()
        print(f"[CheckpointService] Clone successful, received style_latent")

        return {
            "type": "checkpoint",
            "style_latent": data["style_latent"],
            "checkpoint": model
        }

    def generate_speech(self, text: str, voice_data: dict, settings: dict = None) -> str:
        """Generate speech using checkpoint API"""
        settings = settings or {}

        checkpoint = voice_data.get("checkpoint")
        style_latent = voice_data.get("style_latent")

        if not checkpoint or not style_latent:
            raise ValueError(f"Invalid voice_data: missing checkpoint or style_latent. Keys: {list(voice_data.keys())}")

        print(f"[CheckpointService] Generating speech for checkpoint: {checkpoint}")
        print(f"[CheckpointService] Text: {text[:50]}...")
        print(f"[CheckpointService] Settings: {settings}")

        # Call checkpoint API
        try:
            response = requests.post(
                f"{self.api_url}/tts",
                json={
                    "text": text,
                    "style_latent": style_latent,
                    "checkpoint": checkpoint,
                    "temperature": settings.get("temperature", 0.9),
                    "top_p": settings.get("top_p", 0.85),
                    "top_k": settings.get("top_k", 230)
                },
                timeout=300
            )
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"[CheckpointService] TTS request failed: {e}")
            raise

        # Response is base64-encoded audio
        audio_base64 = response.json()
        audio_data = base64.b64decode(audio_base64)

        # Save to temp file
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_file.write(audio_data)
        temp_file.close()

        print(f"[CheckpointService] Audio generated: {temp_file.name}")
        return temp_file.name
