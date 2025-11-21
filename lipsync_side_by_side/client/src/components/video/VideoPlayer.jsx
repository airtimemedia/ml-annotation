/**
 * Simple VideoPlayer component
 * Displays a single video without any crossfade or re-encoding logic
 */
export default function VideoPlayer({
  videoRef,
  videoUrl,
  muted = false,
  style = {}
}) {
  return (
    <video
      ref={videoRef}
      src={videoUrl}
      preload="auto"
      playsInline
      crossOrigin="anonymous"
      disablePictureInPicture
      muted={muted}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        ...style
      }}
    />
  );
}
