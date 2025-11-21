import { useState } from 'react';
import { VoiceData, Settings, StatusMessage, AudioResult } from '../types';

interface TextInputProps {
  onGenerate?: (data: { text: string; audio: AudioResult }) => void;
  voices: { elevenlabs?: VoiceData } | null;
  settings: Settings;
  disabled: boolean;
}

export default function TextInput({ onGenerate, voices, settings, disabled }: TextInputProps) {
  const [text, setText] = useState<string>(
    "That hurts to admit but um I have no choice in the matter! at least uh not in a way that doesn't go against my interests..."
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) {
      setStatus({ type: 'error', message: 'Please enter some text to synthesize' });
      return;
    }

    if (!voices || !voices.elevenlabs || !voices.elevenlabs.voice_id) {
      setStatus({ type: 'error', message: 'Please clone a voice first' });
      return;
    }

    setIsGenerating(true);
    setStatus({ type: 'loading', message: 'Generating audio...' });

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          voices: voices,
          elevenlabs_settings: settings || {
            model: 'eleven_turbo_v2',
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate audio');
      }

      setStatus({ type: 'success', message: data.message || 'Audio generated successfully!' });

      // Notify parent component
      if (onGenerate) {
        onGenerate({
          text,
          audio: data.audio,
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStatus({ type: 'error', message: errorMessage });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="text-input">
      <div className="form-group">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          disabled={disabled || isGenerating}
          className="form-textarea"
          rows={5}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={!text.trim() || isGenerating || disabled || !voices}
        className="btn btn-primary"
      >
        {isGenerating ? (
          <>
            <span className="spinner"></span>
            Generating Audio...
          </>
        ) : (
          'Generate Audio'
        )}
      </button>

      {status && (
        <div className={`status-message status-${status.type}`}>
          {status.type === 'loading' && <span className="spinner"></span>}
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}
