import { useEffect, useRef } from 'react';
import { getProviderName, getModelDisplay } from '../utils/modelHelpers';
import AudioPlayerWithWaveform from './AudioPlayerWithWaveform';
import { ServiceAudioData, ProviderId } from '../types';

interface DualComparisonViewProps {
  audioData: ServiceAudioData | null;
  provider1: ProviderId;
  provider2: ProviderId;
  model1: string;
  model2: string;
}

export default function DualComparisonView({ audioData, provider1, provider2, model1, model2 }: DualComparisonViewProps) {
  const service1AudioRef = useRef<HTMLAudioElement>(null);
  const service2AudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioData?.service1 && service1AudioRef.current) {
      service1AudioRef.current.load();
    }
    if (audioData?.service2 && service2AudioRef.current) {
      service2AudioRef.current.load();
    }
  }, [audioData]);

  const service1 = audioData?.service1;
  const service2 = audioData?.service2;

  // Debug logging for titles
  useEffect(() => {
    if (service1 && service1.status === 'ready') {
      console.log('[COMPARISON VIEW] Service 1 audio data:', {
        provider: service1.provider,
        model: service1.model,
        path: service1.path,
      });
    }
    if (service2 && service2.status === 'ready') {
      console.log('[COMPARISON VIEW] Service 2 audio data:', {
        provider: service2.provider,
        model: service2.model,
        path: service2.path,
      });
    }
  }, [service1, service2]);

  return (
    <div className="dual-comparison-view">
      <div className="audio-result">
        {service1 && service1.status === 'ready' && service1.provider && service1.model && (
          <h3 className="audio-title">
            {getProviderName(service1.provider as ProviderId)} - {getModelDisplay(service1.model, service1.provider as ProviderId)}
          </h3>
        )}
        {service1 && service1.status === 'ready' ? (
          <AudioPlayerWithWaveform
            src={`/api/tts/audio/${service1.path.split('/').pop()}`}
          />
        ) : (
          <audio
            controls
            className="audio-player audio-player-disabled"
          >
            Your browser does not support the audio element.
          </audio>
        )}
      </div>

      <div className="audio-result">
        {service2 && service2.status === 'ready' && service2.provider && service2.model && (
          <h3 className="audio-title">
            {getProviderName(service2.provider as ProviderId)} - {getModelDisplay(service2.model, service2.provider as ProviderId)}
          </h3>
        )}
        {service2 && service2.status === 'ready' ? (
          <AudioPlayerWithWaveform
            src={`/api/tts/audio/${service2.path.split('/').pop()}`}
          />
        ) : (
          <audio
            controls
            className="audio-player audio-player-disabled"
          >
            Your browser does not support the audio element.
          </audio>
        )}
      </div>
    </div>
  );
}
