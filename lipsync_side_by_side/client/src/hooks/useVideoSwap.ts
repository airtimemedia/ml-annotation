import { useEffect, useRef, RefObject } from 'react';

interface UseVideoSwapProps {
  video1Ref: RefObject<HTMLVideoElement>;
  video2Ref: RefObject<HTMLVideoElement>;
  processedVideos: [string | null, string | null];
  hasSwappedToProcessed: boolean;
  onSwapComplete: () => void;
}

/**
 * Hook to handle seamless, flash-free swapping from original to processed videos
 * Uses hidden preload elements to avoid any visual flicker
 */
export function useVideoSwap({
  video1Ref,
  video2Ref,
  processedVideos,
  hasSwappedToProcessed,
  onSwapComplete
}: UseVideoSwapProps) {
  const isSwapping = useRef(false);
  const preloadVideo1Ref = useRef<HTMLVideoElement | null>(null);
  const preloadVideo2Ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Don't swap if already swapped, already swapping, or processed videos not ready
    if (hasSwappedToProcessed || isSwapping.current || !processedVideos[0] || !processedVideos[1]) {
      return;
    }

    const video1 = video1Ref.current;
    const video2 = video2Ref.current;

    if (!video1 || !video2) {
      return;
    }

    // Start the swap
    isSwapping.current = true;
    console.log('[VideoSwap] Starting flash-free swap to processed videos...');

    // Save current state
    const wasPlaying = !video1.paused;
    const currentTime1 = video1.currentTime;
    const currentTime2 = video2.currentTime;
    const playbackRate = video1.playbackRate;

    console.log('[VideoSwap] Saved state:', {
      wasPlaying,
      currentTime1,
      currentTime2,
      playbackRate
    });

    // Create hidden preload video elements
    const preload1 = document.createElement('video');
    const preload2 = document.createElement('video');

    preload1.preload = 'auto';
    preload2.preload = 'auto';
    preload1.playsInline = true;
    preload2.playsInline = true;
    preload1.muted = true; // Mute preload videos
    preload2.muted = true;

    preloadVideo1Ref.current = preload1;
    preloadVideo2Ref.current = preload2;

    // Track when both videos are ready to swap (buffered at target position)
    let video1Ready = false;
    let video2Ready = false;

    const checkBothReady = () => {
      if (video1Ready && video2Ready) {
        console.log('[VideoSwap] Both videos buffered, performing instant swap...');

        // Instant swap (no visual flash because new video is already buffered)
        video1.src = processedVideos[0];
        video2.src = processedVideos[1];

        // Wait for src to be set, then restore state
        const restoreState = () => {
          // Restore positions
          video1.currentTime = currentTime1;
          video2.currentTime = currentTime2;
          video1.playbackRate = playbackRate;
          video2.playbackRate = playbackRate;

          // Wait for seeks to complete
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Resume playback if was playing
              if (wasPlaying) {
                Promise.all([video1.play(), video2.play()]).then(() => {
                  console.log('[VideoSwap] Swap complete, playback resumed');
                  cleanup();
                  onSwapComplete();
                  isSwapping.current = false;
                }).catch(err => {
                  console.error('[VideoSwap] Failed to resume playback:', err);
                  cleanup();
                  onSwapComplete();
                  isSwapping.current = false;
                });
              } else {
                console.log('[VideoSwap] Swap complete');
                cleanup();
                onSwapComplete();
                isSwapping.current = false;
              }
            });
          });
        };

        // Listen for metadata loaded on actual video elements
        const handleMetadataLoaded = () => {
          restoreState();
        };

        video1.addEventListener('loadedmetadata', handleMetadataLoaded, { once: true });
        video2.addEventListener('loadedmetadata', handleMetadataLoaded, { once: true });
      }
    };

    const cleanup = () => {
      // Remove preload elements
      if (preloadVideo1Ref.current) {
        preloadVideo1Ref.current.src = '';
        preloadVideo1Ref.current = null;
      }
      if (preloadVideo2Ref.current) {
        preloadVideo2Ref.current.src = '';
        preloadVideo2Ref.current = null;
      }
    };

    // Set up preload video 1
    const handlePreload1Canplay = () => {
      console.log('[VideoSwap] Preload 1 can play at target position');
      video1Ready = true;
      checkBothReady();
    };

    const handlePreload2Canplay = () => {
      console.log('[VideoSwap] Preload 2 can play at target position');
      video2Ready = true;
      checkBothReady();
    };

    // Load and seek preload videos to current position
    preload1.addEventListener('loadedmetadata', () => {
      preload1.currentTime = currentTime1;
      preload1.addEventListener('canplay', handlePreload1Canplay, { once: true });
    }, { once: true });

    preload2.addEventListener('loadedmetadata', () => {
      preload2.currentTime = currentTime2;
      preload2.addEventListener('canplay', handlePreload2Canplay, { once: true });
    }, { once: true });

    // Start loading
    console.log('[VideoSwap] Preloading processed videos...');
    preload1.src = processedVideos[0];
    preload2.src = processedVideos[1];
    preload1.load();
    preload2.load();

    // Cleanup function
    return () => {
      cleanup();
    };
  }, [video1Ref, video2Ref, processedVideos, hasSwappedToProcessed, onSwapComplete]);
}
