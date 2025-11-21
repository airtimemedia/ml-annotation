import { useState, useRef, useEffect } from 'react';

/**
 * Custom hook to handle seamless video crossfading when URL changes
 * @param {Object} oldVideoRef - Ref to the currently playing video
 * @param {Object} newVideoRef - Ref to the new video to crossfade to
 * @param {string} videoUrl - Current video URL
 * @returns {Object} - { showNewVideo, prevVideoUrl }
 */
export function useVideoCrossfade(oldVideoRef, newVideoRef, videoUrl) {
  const [showNewVideo, setShowNewVideo] = useState(false);
  const prevVideoUrl = useRef(null);

  useEffect(() => {
    const urlChanged = prevVideoUrl.current && prevVideoUrl.current !== videoUrl;

    if (urlChanged && newVideoRef.current) {
      console.log('[Crossfade] Video URL changed:', prevVideoUrl.current, '->', videoUrl);

      const newVideo = newVideoRef.current;
      const oldVideo = oldVideoRef.current;

      if (!oldVideo) {
        console.warn('[Crossfade] Old video ref not available');
        return;
      }

      let syncRAF = null;

      // Aggressive syncing using requestAnimationFrame
      const syncVideos = () => {
        if (newVideo && oldVideo) {
          // Sync time every frame
          const timeDiff = Math.abs(newVideo.currentTime - oldVideo.currentTime);
          if (timeDiff > 0.05) { // Only sync if difference > 50ms
            newVideo.currentTime = oldVideo.currentTime;
          }

          // Match playback state
          if (!oldVideo.paused && newVideo.paused) {
            newVideo.play().catch(() => {});
          } else if (oldVideo.paused && !newVideo.paused) {
            newVideo.pause();
          }

          syncRAF = requestAnimationFrame(syncVideos);
        }
      };

      // Start crossfade once new video is ready
      const startCrossfade = () => {
        console.log('[Crossfade] New video ready, starting crossfade');

        // Wait for metadata to be loaded before seeking
        if (newVideo.readyState >= 1) {
          // Sync to current position
          newVideo.currentTime = oldVideo.currentTime;
          newVideo.playbackRate = oldVideo.playbackRate;

          // Match playback state
          if (!oldVideo.paused) {
            newVideo.play().catch(err => console.error('[Crossfade] Failed to play new video:', err));
          }

          // Start aggressive syncing
          syncVideos();

          // Start crossfade animation
          setShowNewVideo(true);

          // Complete crossfade after full duration (800ms fade + 200ms buffer)
          setTimeout(() => {
            console.log('[Crossfade] Crossfade complete');
            if (syncRAF) {
              cancelAnimationFrame(syncRAF);
            }

            // Update prevVideoUrl BEFORE triggering re-render
            prevVideoUrl.current = videoUrl;

            // Reset overlay (this will cause oldVideoRef to show the new URL on next render)
            setShowNewVideo(false);
          }, 1000);
        } else {
          // Wait for metadata
          newVideo.addEventListener('loadedmetadata', () => {
            startCrossfade();
          }, { once: true });
        }
      };

      // Check if video is already ready, otherwise wait for canplay
      if (newVideo.readyState >= 3) {
        // Video is already loaded and can play
        startCrossfade();
      } else {
        newVideo.addEventListener('canplay', startCrossfade, { once: true });
      }

      return () => {
        newVideo.removeEventListener('canplay', startCrossfade);
        if (syncRAF) {
          cancelAnimationFrame(syncRAF);
        }
      };
    } else if (!urlChanged) {
      // Only update ref when URL hasn't changed (handles initial load case)
      prevVideoUrl.current = videoUrl;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]); // Only depend on videoUrl

  return { showNewVideo, prevVideoUrl };
}
