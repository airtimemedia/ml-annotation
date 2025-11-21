"""YTTS Service"""
import os
import tempfile
import base64
import json
import traceback
import requests
import torch
from pathlib import Path
from app.utils.audio_utils import convert_to_wav
from .checkpoint_service import CheckpointService

MODEL_CONFIGS = {
    "ytts_v1.0.2": {
        "name": "v1.0.2 (Cantina API)",
        "type": "api",
        "api_url": "https://cantina-ytts.ngrok.app",
        "endpoints": {"clone_speaker": "/clone_speaker", "tts": "/tts"},
    },
    "ytts_v1.1.0": {
        "name": "v1.1.0 (Tahoe API)",
        "type": "api",
        "api_url": "https://tahoe.prod.airtime.com",
        "endpoints": {
            "create_voice": "/voices",
            "get_voice": "/voices/{voice_id}",
            "get_voice_representation": "/voices/{provider}/{voice_id}",
            "create_sample": "/voices/{voice_id}/sample",
        },
    },
    "haitong": {
        "name": "Haitong's Candidate",
        "type": "checkpoint",
        "checkpoint_id": "haitong",
    },
    "zbigniew": {
        "name": "Zbigniew's Candidate",
        "type": "checkpoint",
        "checkpoint_id": "zbigniew",
    },
    "julian": {
        "name": "Julian's Candidate",
        "type": "checkpoint",
        "checkpoint_id": "julian",
    },
}

DECODER_CHECKPOINT = "s3://cantina-tts-checkpoints-us-east-2/runs/AudioCodecs/accoto_decoder_ft.69996384976446e799f1e882104da59b/300k/"


class YTTSService:
    """Service for YTTS API and checkpoint-based models"""

    def __init__(self):
        self.api_url = os.getenv("YTTS_API_URL", "https://cantina-ytts.ngrok.app")
        self.api_key = os.getenv("YTTS_API_KEY", "")
        self.decoder_checkpoint = DECODER_CHECKPOINT
        self.model_configs = MODEL_CONFIGS
        self.checkpoint_service = CheckpointService()

    def clone_voice(self, audio_file_path: str, model: str = "ytts_v1.0.2") -> dict:
        """Clone voice from audio file, returns embeddings dict"""
        model_config = self.model_configs.get(model, self.model_configs["ytts_v1.0.2"])

        print(f"\n[YTTS CLONE] Starting voice clone")
        print(f"[YTTS CLONE] Audio file: {audio_file_path}")
        print(f"[YTTS CLONE] Model: {model_config['name']} ({model_config['type']})")

        if model_config['type'] == 'api':
            # Check which cloning method to use
            if 'clone_speaker' in model_config.get('endpoints', {}):
                # Cantina API - direct base64 cloning
                return self._clone_voice_cantina(audio_file_path, model_config)
            elif 'create_voice' in model_config.get('endpoints', {}):
                # Tahoe API - URL-based voice creation
                return self._clone_voice_tahoe(audio_file_path, model_config)
            else:
                raise ValueError(f"Model {model} does not support voice cloning. Available endpoints: {list(model_config.get('endpoints', {}).keys())}")
        elif model_config['type'] == 'checkpoint':
            # Delegate to CheckpointService
            checkpoint_id = model_config['checkpoint_id']
            print(f"[YTTS CLONE] Delegating to CheckpointService for: {checkpoint_id}")
            return self.checkpoint_service.clone_voice(audio_file_path, checkpoint_id)
        else:
            raise ValueError(f"Unknown model type: {model_config['type']}")

    def _clone_voice_cantina(self, audio_file_path: str, model_config: dict) -> dict:
        """Clone voice using HTTP API (v1.0.2 Cantina)"""
        api_url = model_config['api_url']
        clone_endpoint = model_config['endpoints']['clone_speaker']
        print(f"[YTTS CLONE API] Using API URL: {api_url}")

        try:
            # Read and encode audio file
            with open(audio_file_path, 'rb') as f:
                wav_data = f.read()
                wav_base64 = base64.b64encode(wav_data).decode('utf-8')

            print(f"[YTTS CLONE API] Audio file size: {len(wav_data)} bytes")
            print(f"[YTTS CLONE API] Base64 size: {len(wav_base64)} chars")

            # Send clone request
            clone_url = f"{api_url}{clone_endpoint}"
            print(f"[YTTS CLONE API] POST to {clone_url}")

            response = requests.post(
                clone_url,
                json={"wav_base64": wav_base64},
                timeout=60
            )

            print(f"[YTTS CLONE API] Response status: {response.status_code}")
            print(f"[YTTS CLONE API] Response content-type: {response.headers.get('content-type')}")
            print(f"[YTTS CLONE API] Response size: {len(response.content)} bytes")

            response.raise_for_status()

            # Response is a .pth file containing embeddings
            with tempfile.NamedTemporaryFile(suffix=".pth", delete=False) as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name

            embeddings = torch.load(tmp_path, map_location="cpu")
            os.unlink(tmp_path)

            print(f"[YTTS CLONE API] Embeddings keys: {list(embeddings.keys())}")

            # Convert tensors to lists for JSON serialization
            serialized_embeddings = {}
            for key, value in embeddings.items():
                if hasattr(value, 'tolist'):
                    serialized_embeddings[key] = {
                        "data": value.tolist(),
                        "shape": list(value.shape),
                        "dtype": str(value.dtype)
                    }
                    print(f"[YTTS CLONE API] Serialized {key}: shape={value.shape}")
                else:
                    serialized_embeddings[key] = value

            print(f"[YTTS CLONE API] ✓ Clone successful")

            return {
                "type": "api",
                "embeddings": serialized_embeddings,
                "model_config": model_config
            }

        except Exception as e:
            print(f"[YTTS CLONE API] ✗ Error: {str(e)}")
            traceback.print_exc()
            raise

    def _clone_voice_tahoe(self, audio_file_path: str, model_config: dict) -> dict:
        """
        Clone voice using Tahoe API (v1.1.0).

        Tahoe requires WAV format and uses multipart form upload with metadata.
        Returns a voice object with sample-url for TTS generation.
        """
        api_url = model_config['api_url']
        create_voice_endpoint = model_config['endpoints']['create_voice']

        print(f"[YTTS CLONE TAHOE] Using API URL: {api_url}")
        print(f"[YTTS CLONE TAHOE] Local file: {audio_file_path}")

        # Tahoe API strictly requires WAV format - convert if needed
        wav_file_path = None
        needs_cleanup = False
        try:
            wav_file_path = convert_to_wav(audio_file_path)
            needs_cleanup = (wav_file_path != audio_file_path)
            print(f"[YTTS CLONE TAHOE] WAV file: {wav_file_path} (cleanup={needs_cleanup})")
        except Exception as e:
            print(f"[YTTS CLONE TAHOE] ✗ Error converting audio to WAV: {e}")
            raise

        try:
            # Multipart form upload with metadata
            create_url = f"{api_url}{create_voice_endpoint}"
            print(f"[YTTS CLONE TAHOE] POST to {create_url} (multipart upload with metadata)")

            # Prepare metadata
            filename = os.path.basename(wav_file_path)
            metadata = {
                "display-name": filename.replace('.wav', '').replace('.mp3', ''),
                "app-id": "tts-side-by-side",
                "creator": "tts-comparison-tool"
            }
            print(f"[YTTS CLONE TAHOE] Metadata: {metadata}")

            with open(wav_file_path, 'rb') as audio_file:
                files = {
                    'file': (filename, audio_file, 'audio/wav'),
                    'metadata': (None, json.dumps(metadata), 'application/json')
                }

                response = requests.post(
                    create_url,
                    files=files,
                    timeout=120
                )

            print(f"[YTTS CLONE TAHOE] Response status: {response.status_code}")
            print(f"[YTTS CLONE TAHOE] Response content-type: {response.headers.get('content-type')}")

            # Log response body for debugging
            if response.status_code >= 400:
                print(f"[YTTS CLONE TAHOE] Error response body: {response.text}")
            else:
                print(f"[YTTS CLONE TAHOE] Success response body: {response.text[:500]}")

            response.raise_for_status()

            voice_data = response.json()
            print(f"[YTTS CLONE TAHOE] Voice data keys: {list(voice_data.keys())}")
            print(f"[YTTS CLONE TAHOE] ✓ Voice created successfully")

            return {
                "type": "tahoe",
                "voice_url": voice_data.get("self"),  # Full voice URL
                "voice_id": voice_data.get("self", "").split("/")[-1] if voice_data.get("self") else None,
                "provider": voice_data.get("provider"),
                "display_name": voice_data.get("display-name"),
                "sample_url": voice_data.get("sample-url"),
                "model_config": model_config
            }

        except Exception as e:
            print(f"[YTTS CLONE TAHOE] ✗ Error: {str(e)}")
            traceback.print_exc()
            raise
        finally:
            # Clean up converted WAV file if we created a new one
            if needs_cleanup and wav_file_path and os.path.exists(wav_file_path):
                print(f"[YTTS CLONE TAHOE] Cleaning up converted file: {wav_file_path}")
                os.unlink(wav_file_path)

    def generate_speech(self, text: str, voice_data: dict, settings: dict = None) -> str:
        """Generate speech from text, returns path to audio file"""
        settings = settings or {}
        model = settings.get("model", "ytts_v1.0.2")
        temperature = settings.get("temperature", 0.9)
        top_p = settings.get("top_p", 0.85)
        top_k = settings.get("top_k", 230)
        audio_temperature = settings.get("audio_temperature", 0.55)

        print(f"\n[YTTS GENERATE] Starting speech generation")
        print(f"[YTTS GENERATE] Text: {text[:80]}...")
        print(f"[YTTS GENERATE] Voice data keys: {list(voice_data.keys())}")
        print(f"[YTTS GENERATE] Voice data type: {voice_data.get('type')}")
        print(f"[YTTS GENERATE] Model: {model}")
        print(f"[YTTS GENERATE] Params: temp={temperature}, top_p={top_p}, top_k={top_k}, audio_temp={audio_temperature}")

        # Check voice data type and delegate appropriately
        if voice_data.get("type") == "checkpoint":
            # Delegate to CheckpointService
            print(f"[YTTS GENERATE] Delegating to CheckpointService")
            return self.checkpoint_service.generate_speech(text, voice_data, settings)
        elif voice_data.get("type") == "api":
            # Check if we have embeddings
            if "embeddings" not in voice_data:
                raise ValueError(f"Voice data missing 'embeddings' key. Available keys: {list(voice_data.keys())}")
            return self._generate_speech_api(text, voice_data, settings)
        elif voice_data.get("type") == "tahoe":
            # Tahoe API uses sample-url for TTS generation
            if "sample_url" not in voice_data:
                raise ValueError(f"Voice data missing 'sample_url' key. Available keys: {list(voice_data.keys())}")
            return self._generate_speech_tahoe(text, voice_data, settings)
        else:
            raise ValueError(f"Unknown voice data type: {voice_data.get('type')}")

    def _generate_speech_tahoe(self, text: str, voice_data: dict, settings: dict) -> str:
        """
        Generate speech using Tahoe API (v1.1.0).

        Posts text to the voice's sample-url endpoint and streams back audio.
        Tahoe typically returns MP4/AAC format audio.
        """
        sample_url = voice_data["sample_url"]

        print(f"[YTTS GENERATE TAHOE] Using sample URL: {sample_url}")
        print(f"[YTTS GENERATE TAHOE] Text: {text[:80]}...")

        try:
            # Send TTS request to sample-url
            payload = {"text": text}
            print(f"[YTTS GENERATE TAHOE] POST to {sample_url}")

            response = requests.post(
                sample_url,
                json=payload,
                stream=True,
                timeout=120
            )

            print(f"[YTTS GENERATE TAHOE] Response status: {response.status_code}")
            print(f"[YTTS GENERATE TAHOE] Response content-type: {response.headers.get('content-type')}")

            response.raise_for_status()

            # Save audio stream to temp file
            # Tahoe returns audio (typically MP4/AAC format)
            content_type = response.headers.get('content-type', '')
            if 'mp4' in content_type or 'mpeg' in content_type:
                suffix = '.mp4'
            elif 'wav' in content_type:
                suffix = '.wav'
            else:
                # Default to mp3 for generic audio types
                suffix = '.mp3'

            temp_file = tempfile.NamedTemporaryFile(suffix=suffix, delete=False, dir=tempfile.gettempdir())

            # Write response stream in chunks
            bytes_written = 0
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    temp_file.write(chunk)
                    bytes_written += len(chunk)

            temp_file.close()

            print(f"[YTTS GENERATE TAHOE] Audio data size: {bytes_written} bytes")
            print(f"[YTTS GENERATE TAHOE] ✓ Audio saved to {temp_file.name}")

            return temp_file.name

        except Exception as e:
            print(f"[YTTS GENERATE TAHOE] ✗ Error: {str(e)}")
            traceback.print_exc()
            raise

    def _generate_speech_api(self, text: str, voice_data: dict, settings: dict) -> str:
        """Generate speech using HTTP API"""
        model_config = voice_data["model_config"]
        embeddings = voice_data["embeddings"]
        api_url = model_config["api_url"]

        print(f"[YTTS GENERATE API] Using API URL: {api_url}")
        print(f"[YTTS GENERATE API] Embeddings keys: {list(embeddings.keys())}")
        print(f"[YTTS GENERATE API] gpt_cond_latent type: {type(embeddings.get('gpt_cond_latent'))}")

        try:
            # Deserialize embeddings back from JSON format
            if "gpt_cond_latent" in embeddings and isinstance(embeddings["gpt_cond_latent"], dict):
                # Embeddings are in serialized format (dict with "data", "shape", "dtype")
                print(f"[YTTS GENERATE API] Deserializing embeddings from JSON format")
                gpt_cond_latent = embeddings["gpt_cond_latent"]["data"]
                speaker_embedding = embeddings.get("speaker_embedding", {}).get("data")
                print(f"[YTTS GENERATE API] gpt_cond_latent shape: {embeddings['gpt_cond_latent']['shape']}")
                if speaker_embedding is not None:
                    print(f"[YTTS GENERATE API] speaker_embedding shape: {embeddings['speaker_embedding']['shape']}")
            elif "gpt_cond_latent" in embeddings and isinstance(embeddings["gpt_cond_latent"], list):
                # Embeddings are already plain lists (already deserialized)
                print(f"[YTTS GENERATE API] Embeddings already in list format")
                gpt_cond_latent = embeddings["gpt_cond_latent"]
                speaker_embedding = embeddings.get("speaker_embedding")
                print(f"[YTTS GENERATE API] gpt_cond_latent length: {len(gpt_cond_latent)}")
                if speaker_embedding is not None:
                    print(f"[YTTS GENERATE API] speaker_embedding length: {len(speaker_embedding)}")
            else:
                # Embeddings are torch tensors
                print(f"[YTTS GENERATE API] Converting torch tensors to lists")
                gpt_cond_latent = embeddings["gpt_cond_latent"].tolist()
                speaker_embedding = embeddings.get("speaker_embedding")
                if speaker_embedding is not None and hasattr(speaker_embedding, 'tolist'):
                    speaker_embedding = speaker_embedding.tolist()

            # Build payload
            payload = {
                "text": text,
                "gpt_cond_latent": gpt_cond_latent,
                "speaker_embedding": speaker_embedding,
                "language": "en",
                "add_wav_header": True,
            }

            # Send TTS request
            tts_url = f"{api_url}/tts"
            print(f"[YTTS GENERATE API] POST to {tts_url}")

            response = requests.post(
                tts_url,
                json=payload,
                timeout=120
            )

            print(f"[YTTS GENERATE API] Response status: {response.status_code}")
            print(f"[YTTS GENERATE API] Response content-type: {response.headers.get('content-type')}")

            response.raise_for_status()

            # Response is base64-encoded WAV audio
            audio_base64 = response.json()
            audio_data = base64.b64decode(audio_base64)

            print(f"[YTTS GENERATE API] Audio data size: {len(audio_data)} bytes")

            # Save to temp file
            temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False, dir=tempfile.gettempdir())
            temp_file.write(audio_data)
            temp_file.close()

            print(f"[YTTS GENERATE API] ✓ Audio saved to {temp_file.name}")
            return temp_file.name

        except Exception as e:
            print(f"[YTTS GENERATE API] ✗ Error: {str(e)}")
            traceback.print_exc()
            raise
