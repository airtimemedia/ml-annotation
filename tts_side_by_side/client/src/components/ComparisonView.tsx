import { useEffect, useRef } from 'react';
import AudioPlayerWithWaveform from './AudioPlayerWithWaveform';

interface ComparisonViewAudioData {
  elevenlabs?: {
    status: string;
    path: string;
  };
  other_api?: {
    status: string;
    path: string;
  };
}

interface ComparisonViewProps {
  audioData: ComparisonViewAudioData | null;
}

export default function ComparisonView({ audioData }: ComparisonViewProps) {
  const elevenlabsAudioRef = useRef<HTMLAudioElement>(null);
  const otherApiAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // When new audio is generated, reset both audio players
    if (elevenlabsAudioRef.current) {
      elevenlabsAudioRef.current.load();
    }
    if (otherApiAudioRef.current) {
      otherApiAudioRef.current.load();
    }
  }, [audioData]);

  if (!audioData) {
    return (
      <div className="comparison-view">
        <div className="comparison-placeholder">
          <svg className="placeholder-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18V5l12-2v13M9 18l-7 2V7l7-2M9 18c0 1.657-1.343 3-3 3s-3-1.343-3-3M15 16c0 1.657-1.343 3-3 3s-3-1.343-3-3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p>Generate audio to hear the comparison</p>
        </div>
      </div>
    );
  }

  const { elevenlabs, other_api } = audioData;

  return (
    <div className="comparison-view">
      <div className="comparison-container">
        <div className="comparison-side">
          <div className="comparison-header">
            <h3>ElevenLabs</h3>
          </div>
          {elevenlabs && elevenlabs.status === 'ready' ? (
            <div className="audio-player-wrapper">
              <AudioPlayerWithWaveform
                src={`/api/tts/audio/${elevenlabs.path.split('/').pop()}`}
                className="audio-player"
              />
            </div>
          ) : (
            <div className="audio-placeholder-small">
              <p>Audio not available</p>
            </div>
          )}
        </div>

        <div className="comparison-divider"></div>

        <div className="comparison-side">
          <div className="comparison-header">
            <h3>YTTS API</h3>
          </div>
          {other_api && other_api.status === 'ready' ? (
            <div className="audio-player-wrapper">
              <AudioPlayerWithWaveform
                src={`/api/tts/audio/${other_api.path.split('/').pop()}`}
                className="audio-player"
              />
            </div>
          ) : (
            <div className="audio-placeholder-small">
              <p>Coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
