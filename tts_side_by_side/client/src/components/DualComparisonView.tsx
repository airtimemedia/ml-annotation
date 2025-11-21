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

  return (
    <div className="dual-comparison-view">
      <div className="audio-result">
        <h3 className="audio-title">
          {getProviderName(provider1)} - {getModelDisplay(model1, provider1)}
        </h3>
        <div className="audio-player-wrapper">
          {service1 && service1.status === 'ready' ? (
            <AudioPlayerWithWaveform
              src={`/api/tts/audio/${service1.path.split('/').pop()}`}
              className="audio-player"
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

      <div className="audio-result">
        <h3 className="audio-title">
          {getProviderName(provider2)} - {getModelDisplay(model2, provider2)}
        </h3>
        <div className="audio-player-wrapper">
          {service2 && service2.status === 'ready' ? (
            <AudioPlayerWithWaveform
              src={`/api/tts/audio/${service2.path.split('/').pop()}`}
              className="audio-player"
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
    </div>
  );
}
