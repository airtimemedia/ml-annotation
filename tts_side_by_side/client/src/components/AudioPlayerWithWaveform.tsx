import { useEffect, useRef, useState } from 'react';
import './AudioPlayerWithWaveform.css';

interface AudioPlayerWithWaveformProps {
  src: string;
  className?: string;
}

export default function AudioPlayerWithWaveform({ src, className = '' }: AudioPlayerWithWaveformProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);

  useEffect(() => {
    if (!src) return;

    // Fetch and analyze the audio file to generate waveform
    const generateWaveform = async () => {
      try {
        const response = await fetch(src);

        // Check if response is valid
        if (!response.ok) {
          console.warn('Failed to fetch audio for waveform');
          return;
        }

        const arrayBuffer = await response.arrayBuffer();

        // Check if arrayBuffer has content
        if (arrayBuffer.byteLength === 0) {
          console.warn('Audio file is empty, skipping waveform generation');
          return;
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get the raw audio data from the first channel
        const rawData = audioBuffer.getChannelData(0);
        const samples = 200; // Number of bars in the waveform
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];

        // Sample the audio data
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }

        // Normalize the data
        const multiplier = Math.max(...filteredData) ** -1;
        const normalizedData = filteredData.map(n => n * multiplier);

        setWaveformData(normalizedData);

        audioContext.close();
      } catch (error) {
        // Silently fail for waveform generation - audio player will still work
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Waveform generation skipped:', errorMessage);
      }
    };

    generateWaveform();
  }, [src]);

  useEffect(() => {
    if (!waveformData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw waveform
    const barWidth = rect.width / waveformData.length;
    const barGap = barWidth * 0.4;
    const drawWidth = barWidth - barGap;

    // Use a more subtle color
    ctx.fillStyle = 'rgba(29, 29, 31, 0.2)';

    waveformData.forEach((amplitude, index) => {
      const x = index * barWidth;
      const barHeight = Math.max(amplitude * rect.height * 0.75, 2); // Minimum height of 2px
      const y = (rect.height - barHeight) / 2;

      // Round the corners of bars
      ctx.beginPath();
      ctx.roundRect(x, y, drawWidth, barHeight, 1.5);
      ctx.fill();
    });
  }, [waveformData]);

  return (
    <div className={`audio-player-with-waveform ${className}`}>
      <audio
        ref={audioRef}
        controls
        controlsList="nodownload"
        src={src}
        className="audio-player"
      >
        Your browser does not support the audio element.
      </audio>
      <div className="waveform-container">
        {!waveformData && (
          <div className="waveform-placeholder">
            Loading waveform...
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="waveform-canvas"
          style={{ display: waveformData ? 'block' : 'none' }}
        />
      </div>
    </div>
  );
}
