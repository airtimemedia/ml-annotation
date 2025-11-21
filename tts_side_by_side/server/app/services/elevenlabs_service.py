"""ElevenLabs TTS service"""
import os
import tempfile
import hashlib

from elevenlabs import save
from elevenlabs.client import ElevenLabs, VoiceSettings


class ElevenLabsService:
    """Service for interacting with ElevenLabs API"""

    def __init__(self):
        api_key = os.environ.get("ELEVENLABS_API_KEY")
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY environment variable not set")

        self.client = ElevenLabs(api_key=api_key)
        self._voice_cache = {}  # Cache for cloned voices

    def _get_voice_name(self, audio_path: str) -> str:
        """Generate unique voice name from audio file hash"""
        with open(audio_path, "rb") as f:
            file_hash = hashlib.md5(f.read()).hexdigest()[:8]
        return f"voice_{file_hash}"

    def clone_voice(self, audio_path: str, model: str = None) -> str:
        """Clone voice from audio file, returns voice_id"""
        voice_name = self._get_voice_name(audio_path)

        if voice_name in self._voice_cache:
            print(f"Voice {voice_name} already in cache")
            return self._voice_cache[voice_name]

        existing_voices = self.client.voices.get_all().voices
        voice_dict = {voice.name: voice.voice_id for voice in existing_voices}

        if voice_name in voice_dict:
            print(f"Voice {voice_name} already exists in ElevenLabs")
            voice_id = voice_dict[voice_name]
            self._voice_cache[voice_name] = voice_id
            return voice_id

        print(f"Cloning new voice {voice_name}...")
        try:
            voice = self.client.clone(
                name=voice_name,
                files=[audio_path],
                description="Cloned voice from TTS comparison app",
            )
            voice_id = voice.voice_id
            self._voice_cache[voice_name] = voice_id
            print(f"Successfully cloned voice {voice_name} with ID {voice_id}")
            return voice_id
        except Exception as e:
            print(f"Error cloning voice: {e}")
            if voice_dict:
                fallback_voice_id = list(voice_dict.values())[0]
                print(f"Falling back to voice ID: {fallback_voice_id}")
                return fallback_voice_id
            raise

    def generate_speech(self, text: str, voice_id: str, settings: dict = None) -> str:
        """Generate speech from text, returns path to audio file"""
        default_settings = {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
            "speed": 1.0
        }

        if settings:
            default_settings.update(settings)

        model_id = settings.get("model", "eleven_turbo_v2") if settings else "eleven_turbo_v2"
        print(f"Generating speech with voice_id={voice_id}, model={model_id}")

        audio_generator = self.client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id=model_id,
            voice_settings=VoiceSettings(
                stability=default_settings["stability"],
                similarity_boost=default_settings["similarity_boost"],
                style=default_settings["style"],
                use_speaker_boost=default_settings["use_speaker_boost"],
                speed=default_settings["speed"],
            ),
        )

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            save(audio_generator, f.name)
            print(f"Generated audio saved to {f.name}")
            return f.name
