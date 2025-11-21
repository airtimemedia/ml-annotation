import { useState } from 'react';
import {
  GenerationState,
  StatusMessage,
  ServiceAudioData,
  GenerateAudioParams,
  ServiceType,
} from '../types';

interface UseTTSGenerationReturn {
  isGenerating: GenerationState;
  status: StatusMessage | null;
  audioData: ServiceAudioData | null;
  generateAudio: (service: ServiceType, params: GenerateAudioParams) => Promise<void>;
}

/**
 * Custom hook for managing TTS generation state and logic
 */
export const useTTSGeneration = (): UseTTSGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState<GenerationState>({
    service1: false,
    service2: false,
    both: false,
  });
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [audioData, setAudioData] = useState<ServiceAudioData | null>(null);

  const generateAudio = async (
    service: ServiceType,
    { text, voices, settings1, settings2, provider1, provider2 }: GenerateAudioParams
  ): Promise<void> => {
    if (!text.trim()) {
      setStatus({ type: 'error', message: 'Please enter text to synthesize' });
      return;
    }

    if (!voices) {
      setStatus({ type: 'error', message: 'Please clone a voice first' });
      return;
    }

    const generateFor1 = service === 'service1' || service === 'both';
    const generateFor2 = service === 'service2' || service === 'both';

    // Validate we have required data - fail fast, no fallbacks
    if (generateFor1) {
      if (!provider1) {
        throw new Error('Service 1: Provider is required');
      }
      if (!settings1 || !settings1.model) {
        throw new Error('Service 1: Settings with model are required');
      }
    }
    if (generateFor2) {
      if (!provider2) {
        throw new Error('Service 2: Provider is required');
      }
      if (!settings2 || !settings2.model) {
        throw new Error('Service 2: Settings with model are required');
      }
    }

    setIsGenerating({
      service1: generateFor1,
      service2: generateFor2,
      both: service === 'both',
    });
    setStatus({
      type: 'loading',
      message: `Generating audio for ${service === 'both' ? 'both services' : service}...`
    });

    try {
      let service1Audio = null;
      let service2Audio = null;

      // Generate for Service 1
      if (generateFor1) {
        const payload1 = {
          text: text.trim(),
          voices: voices,
          provider: provider1,
          settings: settings1,
        };
        console.log('[GENERATE] Service 1 request:', payload1);
        console.log('[GENERATE] Service 1 model:', settings1.model);

        const response1 = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload1),
        });

        console.log('[GENERATE] Service 1 response status:', response1.status);
        const data1 = await response1.json();
        console.log('[GENERATE] Service 1 response data:', data1);

        if (!response1.ok) {
          throw new Error(data1.error || 'Failed to generate audio for Service 1');
        }

        service1Audio = {
          ...data1.audio,
          provider: provider1,
          model: settings1.model,
        };
      }

      // Generate for Service 2
      if (generateFor2) {
        const payload2 = {
          text: text.trim(),
          voices: voices,
          provider: provider2,
          settings: settings2,
        };
        console.log('[GENERATE] Service 2 request:', payload2);
        console.log('[GENERATE] Service 2 model:', settings2.model);

        const response2 = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload2),
        });

        console.log('[GENERATE] Service 2 response status:', response2.status);
        const data2 = await response2.json();
        console.log('[GENERATE] Service 2 response data:', data2);

        if (!response2.ok) {
          throw new Error(data2.error || 'Failed to generate audio for Service 2');
        }

        service2Audio = {
          ...data2.audio,
          provider: provider2,
          model: settings2.model,
        };
      }

      // Update audio data based on which services were generated
      setAudioData(prev => ({
        service1: service1Audio || prev?.service1,
        service2: service2Audio || prev?.service2,
      }));

      setStatus({ type: 'success', message: 'Audio generated successfully!' });
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStatus({ type: 'error', message: errorMessage });
    } finally {
      setIsGenerating({ service1: false, service2: false, both: false });
    }
  };

  return {
    isGenerating,
    status,
    audioData,
    generateAudio,
  };
};
