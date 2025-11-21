"""
Provider Registry - Central configuration for all TTS providers

This module provides a unified interface for working with different TTS providers.
Adding a new provider only requires:
1. Creating a service class with clone_voice() and generate_speech() methods
2. Registering it in this file
"""

from typing import Dict, Optional, Any
from .elevenlabs_service import ElevenLabsService
from .ytts_service import YTTSService


class ProviderRegistry:
    """Registry for TTS providers"""

    def __init__(self):
        # Initialize all provider services
        self._providers: Dict[str, Any] = {
            'elevenlabs': ElevenLabsService(),
            'ytts': YTTSService(),
        }

        # Provider metadata
        self._provider_info = {
            'elevenlabs': {
                'id': 'elevenlabs',
                'name': 'ElevenLabs',
                'description': 'ElevenLabs TTS API',
            },
            'ytts': {
                'id': 'ytts',
                'name': 'YTTS',
                'description': 'YTTS models including v1.0.2, v1.1.0, and deployed checkpoints',
            },
        }

    def get_service(self, provider_id: str):
        """
        Get service instance for a provider

        Args:
            provider_id: Provider identifier (e.g., 'elevenlabs', 'ytts')

        Returns:
            Service instance

        Raises:
            ValueError: If provider is not found
        """
        if provider_id not in self._providers:
            raise ValueError(f"Unknown provider: {provider_id}")
        return self._providers[provider_id]

    def get_provider_info(self, provider_id: str) -> Dict[str, str]:
        """Get metadata for a provider"""
        if provider_id not in self._provider_info:
            raise ValueError(f"Unknown provider: {provider_id}")
        return self._provider_info[provider_id]

    def list_providers(self) -> list:
        """List all available providers"""
        return list(self._provider_info.values())

    def is_valid_provider(self, provider_id: str) -> bool:
        """Check if provider exists"""
        return provider_id in self._providers

    def clone_voice(self, provider_id: str, audio_file_path: str, model: str = None):
        """
        Clone a voice using specified provider

        Args:
            provider_id: Provider identifier
            audio_file_path: Path to audio file
            model: Optional model identifier for providers that support multiple models

        Returns:
            Voice ID (str) for simple providers like ElevenLabs, or
            Voice data dict for complex providers like YTTS
        """
        service = self.get_service(provider_id)
        if model:
            return service.clone_voice(audio_file_path, model=model)
        return service.clone_voice(audio_file_path)

    def generate_speech(
        self,
        provider_id: str,
        text: str,
        voice_data,
        settings: Optional[Dict] = None
    ) -> str:
        """
        Generate speech using specified provider

        Args:
            provider_id: Provider identifier
            text: Text to synthesize
            voice_data: Voice ID (str) for simple providers, or voice data dict for YTTS
            settings: Provider-specific settings

        Returns:
            Path to generated audio file
        """
        print(f"[PROVIDER REGISTRY] generate_speech called for provider: {provider_id}")
        print(f"[PROVIDER REGISTRY] voice_data type: {type(voice_data)}")
        if isinstance(voice_data, dict):
            print(f"[PROVIDER REGISTRY] voice_data keys: {list(voice_data.keys())}")

        service = self.get_service(provider_id)

        # Determine call format based on voice_data structure:
        # - If voice_data has "type" field (api/checkpoint/tahoe), it's YTTS complex format
        # - If voice_data is a dict with ONLY voice_id and no type, it's simple format (ElevenLabs)
        # - Otherwise pass voice_data as-is (works for both str and dict)
        if isinstance(voice_data, dict) and "type" in voice_data:
            # Complex provider format (YTTS) - has type field
            print(f"[PROVIDER REGISTRY] Using complex provider format (YTTS) with type={voice_data['type']}")
            return service.generate_speech(
                text=text,
                voice_data=voice_data,
                settings=settings or {}
            )
        elif isinstance(voice_data, dict) and "voice_id" in voice_data and "type" not in voice_data:
            # Simple provider format (ElevenLabs) - has voice_id but no type
            print(f"[PROVIDER REGISTRY] Using simple provider format with voice_id")
            return service.generate_speech(
                text=text,
                voice_id=voice_data["voice_id"],
                settings=settings or {}
            )
        else:
            # Either a string (old format) or complex dict without type field
            print(f"[PROVIDER REGISTRY] Using fallback format (passing voice_data as-is)")
            return service.generate_speech(
                text=text,
                voice_data=voice_data,
                settings=settings or {}
            )


# Singleton instance
_registry = None


def get_provider_registry() -> ProviderRegistry:
    """Get the singleton provider registry instance"""
    global _registry
    if _registry is None:
        _registry = ProviderRegistry()
    return _registry
