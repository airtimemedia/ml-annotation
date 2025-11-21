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
    const barGap = barWidth * 0.2;
    const drawWidth = barWidth - barGap;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';

    waveformData.forEach((amplitude, index) => {
      const x = index * barWidth;
      const barHeight = amplitude * rect.height * 0.8;
      const y = (rect.height - barHeight) / 2;

      ctx.fillRect(x, y, drawWidth, barHeight);
    });
  }, [waveformData]);

  return (
    <div className={`audio-player-with-waveform ${className}`}>
      <canvas ref={canvasRef} className="waveform-canvas" />
      <audio
        ref={audioRef}
        controls
        controlsList="nodownload"
        src={src}
        className="audio-player-overlay"
      >
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
