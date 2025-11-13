import { useEffect, useRef } from 'react';
import './VideoPlayer.css';

interface VideoPlayerProps {
  videoUrl: string;
}

export function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked by browser
      });
    }
  }, [videoUrl]);

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        controls
        autoPlay
        loop
        className="video-player__video"
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
