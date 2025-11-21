import { useRef, useCallback, useState, useEffect, RefObject } from 'react';
import {
  INITIAL_TIME,
  INITIAL_DURATION,
  INITIAL_PROGRESS,
  PERCENTAGE_MULTIPLIER,
  MIN_VIDEO_TIME,
  DEFAULT_VIDEO_FPS
} from '../constants/index';

interface UseVideoSyncReturn {
  video1Ref: RefObject<HTMLVideoElement>;
  video2Ref: RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  seekToPercent: (percent: number) => void;
  frameStep: (direction: number) => void;
  reset: () => void;
}

export default function useVideoSync(video1Src?: string, video2Src?: string): UseVideoSyncReturn {
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(INITIAL_TIME);
  const [duration, setDuration] = useState(INITIAL_DURATION);
  const [progress, setProgress] = useState(INITIAL_PROGRESS);

  const syncLoopRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);

  // Main sync and autoplay effect - runs when video sources change
  useEffect(() => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;

    if (!video1 || !video2 || !video1Src || !video2Src) {
      return;
    }

    console.log('[VideoSync] Setting up videos');

    // Reset state
    hasStartedRef.current = false;
    setIsPlaying(false);
    setCurrentTime(INITIAL_TIME);
    setProgress(INITIAL_PROGRESS);

    // Set initial position
    video1.currentTime = INITIAL_TIME;
    video2.currentTime = INITIAL_TIME;
    video1.playbackRate = 1.0;
    video2.playbackRate = 1.0;

    // Wait for both videos to be ready, then autoplay
    const checkAndAutoplay = async () => {
      if (hasStartedRef.current) return;

      if (video1.readyState >= 2 && video2.readyState >= 2) {
        console.log('[VideoSync] Both videos ready, starting playback', {
          video1: {
            readyState: video1.readyState,
            paused: video1.paused,
            src: video1.src,
            currentSrc: video1.currentSrc,
            networkState: video1.networkState,
            error: video1.error
          },
          video2: {
            readyState: video2.readyState,
            paused: video2.paused,
            src: video2.src,
            currentSrc: video2.currentSrc,
            networkState: video2.networkState,
            error: video2.error
          }
        });
        hasStartedRef.current = true;

        // Sync position precisely to start frame
        video1.currentTime = INITIAL_TIME;
        video2.currentTime = INITIAL_TIME;

        // Wait for currentTime to settle
        await new Promise(resolve => setTimeout(resolve, 50));

        // Force exact sync before starting
        const startTime = video1.currentTime;
        video2.currentTime = startTime;

        console.log('[VideoSync] 🎬 Initial sync:', {
          video1Time: video1.currentTime,
          video2Time: video2.currentTime,
          drift: Math.abs(video1.currentTime - video2.currentTime)
        });

        // Wait one more frame to ensure both are at exact same position
        await new Promise(resolve => setTimeout(resolve, 16));

        // Start playback - use Promise.all to start simultaneously
        try {
          console.log('[VideoSync] Starting both videos simultaneously...');
          await Promise.all([video1.play(), video2.play()]);

          setIsPlaying(true);
          console.log('[VideoSync] ✅ Both videos playing from frame:', {
            video1Time: video1.currentTime.toFixed(3),
            video2Time: video2.currentTime.toFixed(3),
            drift: Math.abs(video1.currentTime - video2.currentTime).toFixed(3)
          });
        } catch (error) {
          console.error('[VideoSync] Autoplay failed:', error);
          console.log('[VideoSync] Video states after error:', {
            video1: {
              paused: video1.paused,
              error: video1.error,
              networkState: video1.networkState,
              readyState: video1.readyState
            },
            video2: {
              paused: video2.paused,
              error: video2.error,
              networkState: video2.networkState,
              readyState: video2.readyState
            }
          });
          // Reset flag to allow manual play
          hasStartedRef.current = false;
        }
      }
    };

    // Try immediately and on metadata load
    const handleLoadedMetadata = () => {
      console.log('[VideoSync] Metadata loaded', {
        video1Duration: video1.duration,
        video2Duration: video2.duration
      });

      // Use the shorter duration so progress reaches 100% when the shorter video ends
      const shortestDuration = Math.min(video1.duration, video2.duration);
      setDuration(shortestDuration);

      checkAndAutoplay();
    };

    const handleCanPlay = () => {
      console.log('[VideoSync] Can play');
      checkAndAutoplay();
    };

    video1.addEventListener('loadedmetadata', handleLoadedMetadata);
    video2.addEventListener('loadedmetadata', handleLoadedMetadata);
    video1.addEventListener('canplay', handleCanPlay, { once: true });
    video2.addEventListener('canplay', handleCanPlay, { once: true });

    // Sync loop - keeps videos in sync during playback
    const syncLoop = () => {
      // Update UI based on video1
      setCurrentTime(video1.currentTime);
      setProgress((video1.currentTime / video1.duration) * PERCENTAGE_MULTIPLIER);

      // Only sync time drift when BOTH videos are actually playing
      // Don't try to restart paused videos - that causes race conditions
      if (!video1.paused && !video2.paused) {
        const drift = Math.abs(video1.currentTime - video2.currentTime);
        // Sync if drift exceeds 20ms (about 1 frame at 50fps)
        // This is CRITICAL - must keep videos in sync
        if (drift > 0.02) {
          video2.currentTime = video1.currentTime;
          console.log(`[VideoSync] ⚠️ CORRECTING ${(drift * 1000).toFixed(1)}ms drift at ${video1.currentTime.toFixed(2)}s`);
        }
      }

      syncLoopRef.current = requestAnimationFrame(syncLoop);
    };

    // Handle video end
    const handleEnded = () => {
      console.log('[VideoSync] Video ended');
      video1.pause();
      video2.pause();
      setIsPlaying(false);

      // Set progress to exactly 100% when video ends
      setProgress(PERCENTAGE_MULTIPLIER);
    };

    // Handle video errors
    const handleError = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      const videoNum = target === video1 ? 1 : 2;
      console.error(`[VideoSync] Video ${videoNum} error:`, {
        error: target.error,
        errorCode: target.error?.code,
        errorMessage: target.error?.message,
        src: target.src,
        networkState: target.networkState,
        readyState: target.readyState
      });
    };

    video1.addEventListener('ended', handleEnded);
    video2.addEventListener('ended', handleEnded);
    video1.addEventListener('error', handleError);
    video2.addEventListener('error', handleError);

    // Start sync loop
    syncLoopRef.current = requestAnimationFrame(syncLoop);

    // Check readiness immediately in case already loaded
    checkAndAutoplay();

    return () => {
      console.log('[VideoSync] Cleaning up');
      if (syncLoopRef.current) {
        cancelAnimationFrame(syncLoopRef.current);
      }
      video1.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video2.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video1.removeEventListener('canplay', handleCanPlay);
      video2.removeEventListener('canplay', handleCanPlay);
      video1.removeEventListener('ended', handleEnded);
      video2.removeEventListener('ended', handleEnded);
      video1.removeEventListener('error', handleError);
      video2.removeEventListener('error', handleError);
    };
  }, [video1Src, video2Src]);

  const togglePlayPause = useCallback(async () => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;

    if (!video1 || !video2) return;

    try {
      if (video1.paused || video2.paused) {
        console.log('[VideoSync] Playing');

        // Force exact sync before playing
        video2.currentTime = video1.currentTime;

        console.log('[VideoSync] 🎬 Manual play sync:', {
          video1Time: video1.currentTime.toFixed(3),
          video2Time: video2.currentTime.toFixed(3),
          drift: Math.abs(video1.currentTime - video2.currentTime).toFixed(3)
        });

        await Promise.all([video1.play(), video2.play()]);
        setIsPlaying(true);
      } else {
        console.log('[VideoSync] Pausing');
        video1.pause();
        video2.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('[VideoSync] Toggle failed:', error);
      setIsPlaying(false);
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;

    if (!video1 || !video2) return;

    console.log(`[VideoSync] Seeking to ${time.toFixed(2)}s`);

    video1.currentTime = time;
    video2.currentTime = time;
    setCurrentTime(time);
    setProgress((time / video1.duration) * PERCENTAGE_MULTIPLIER);
  }, []);

  const seekToPercent = useCallback((percent: number) => {
    const video1 = video1Ref.current;
    if (!video1 || !video1.duration) return;

    const time = (percent / PERCENTAGE_MULTIPLIER) * video1.duration;
    seekTo(time);
  }, [seekTo]);

  const frameStep = useCallback((direction: number) => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;

    if (!video1 || !video2) return;

    video1.pause();
    video2.pause();
    setIsPlaying(false);

    const frameTime = 1 / DEFAULT_VIDEO_FPS;
    const newTime = Math.max(MIN_VIDEO_TIME, Math.min(video1.duration, video1.currentTime + (direction * frameTime)));
    seekTo(newTime);
  }, [seekTo]);

  const reset = useCallback(() => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;

    if (!video1 || !video2) return;

    console.log('[VideoSync] Resetting');

    video1.pause();
    video2.pause();
    video1.currentTime = INITIAL_TIME;
    video2.currentTime = INITIAL_TIME;

    setIsPlaying(false);
    setCurrentTime(INITIAL_TIME);
    setProgress(INITIAL_PROGRESS);
  }, []);

  return {
    video1Ref,
    video2Ref,
    isPlaying,
    currentTime,
    duration,
    progress,
    togglePlayPause,
    seekTo,
    seekToPercent,
    frameStep,
    reset
  };
}
