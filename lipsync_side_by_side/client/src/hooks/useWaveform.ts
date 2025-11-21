import { useState, useEffect, RefObject } from 'react';
import { API_BASE_URL, ENDPOINTS, DEFAULT_WAVEFORM_BARS, VIDEO_READY_STATE_THRESHOLD } from '../constants/index';

export default function useWaveform(
  videoRef: RefObject<HTMLVideoElement>,
  originalUrl: string,
  numBars: number = DEFAULT_WAVEFORM_BARS
) {
  const [waveformData, setWaveformData] = useState<number[]>([]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !originalUrl) return;

    let cancelled = false;

    const generateWaveform = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${ENDPOINTS.WAVEFORM}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_url: originalUrl, num_bars: numBars })
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!cancelled && data.waveform) {
          setWaveformData(data.waveform);
        }
      } catch (error) {
        // Silently fail - waveform is optional
      }
    };

    // Generate waveform in background with slight delay to not block video loading
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        generateWaveform();
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [videoRef, originalUrl, numBars]);

  return { waveformData };
}
