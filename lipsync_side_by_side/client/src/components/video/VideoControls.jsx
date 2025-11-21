import { useRef, useState, useCallback, useEffect } from 'react';
import Button from '../ui/Button';
import {
  DEFAULT_TIME,
  SECONDS_PER_MINUTE,
  TIME_DISPLAY_PADDING,
  TIME_DISPLAY_PAD_CHAR,
  PERCENTAGE_MULTIPLIER,
  MIN_PERCENT,
  MAX_PERCENT,
  SEEK_THROTTLE_MS,
  DRAG_END_CLICK_DELAY_MS,
  WAVEFORM_HEIGHT_PERCENT
} from '../../constants/index';
import './VideoControls.css';

export default function VideoControls({
  isPlaying,
  currentTime,
  duration,
  progress,
  onPlayPause,
  onSeek,
  onFrameStep,
  onReset,
  waveformData = []
}) {
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef(null);
  const lastSeekTime = useRef(0);
  const isDraggingRef = useRef(false);

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return `${DEFAULT_TIME}:00`;
    const mins = Math.floor(seconds / SECONDS_PER_MINUTE);
    const secs = Math.floor(seconds % SECONDS_PER_MINUTE);
    return `${mins}:${secs.toString().padStart(TIME_DISPLAY_PADDING, TIME_DISPLAY_PAD_CHAR)}`;
  };

  const handleTimelineClick = (e) => {
    // Don't handle click if we just finished dragging
    if (isDraggingRef.current) return;

    const timeline = e.currentTarget;
    const rect = timeline.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * PERCENTAGE_MULTIPLIER;
    onSeek(percent);
  };

  const handleDragStart = useCallback((e) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrag = useCallback((e) => {
    if (!isDraggingRef.current) return;

    const timeline = timelineRef.current;
    if (!timeline) return;

    e.preventDefault();

    const rect = timeline.getBoundingClientRect();
    const clientX = e.type.includes('touch') ? e.touches[0]?.clientX : e.clientX;

    if (clientX === undefined) return;

    const percent = Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, ((clientX - rect.left) / rect.width) * PERCENTAGE_MULTIPLIER));

    // Throttle seek requests to every SEEK_THROTTLE_MS (~60fps)
    const now = Date.now();
    if (now - lastSeekTime.current < SEEK_THROTTLE_MS) return;
    lastSeekTime.current = now;

    onSeek(percent);
  }, [onSeek]);

  const handleDragEnd = useCallback(() => {
    if (isDraggingRef.current) {
      // Small delay to prevent click event from firing
      setTimeout(() => {
        isDraggingRef.current = false;
      }, DRAG_END_CLICK_DELAY_MS);
    }
    setIsDragging(false);
  }, []);

  // Add global mouse/touch listeners when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMove = (e) => {
      handleDrag(e);
    };

    const handleGlobalEnd = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleGlobalMove);
    document.addEventListener('mouseup', handleGlobalEnd);
    document.addEventListener('touchmove', handleGlobalMove, { passive: false });
    document.addEventListener('touchend', handleGlobalEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalEnd);
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isDragging, handleDrag, handleDragEnd]);

  return (
    <div className="controls">
      <div className="controls-row">
        <div className="timeline-container">
          <div className="timeline-labels">
            <span>{formatTime(currentTime)}</span>
            <span>{Math.round(duration)}s</span>
          </div>
          <div
            ref={timelineRef}
            className="timeline"
            onClick={handleTimelineClick}
          >
            <div className="waveform">
              {waveformData.map((amplitude, index) => (
                <div
                  key={index}
                  className="waveform-bar"
                  style={{ height: `${amplitude * WAVEFORM_HEIGHT_PERCENT}%` }}
                />
              ))}
            </div>
            <div className="timeline-progress" style={{ width: `${progress}%` }} />
            <div
              className="timeline-handle"
              style={{ left: `${progress}%` }}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            />
          </div>
        </div>
      </div>

      <div className="controls-row frame-row">
        <Button
          variant="secondary"
          onClick={onReset}
          className="frame-btn"
        >
          <svg width="16" height="11" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 2h4v12H3V2zM6 8l9-6.5v13L6 8z"/>
          </svg>
        </Button>
        <Button
          variant="secondary"
          onClick={() => onFrameStep(-1)}
          className="frame-btn"
        >
          <span style={{ fontSize: '16px', position: 'relative', top: '1px' }}>⏮</span>
        </Button>
        <Button
          variant="primary"
          onClick={onPlayPause}
          className="play-btn"
        >
          {isPlaying ? '⏸' : '▶'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => onFrameStep(1)}
          className="frame-btn"
        >
          <span style={{ fontSize: '16px', position: 'relative', top: '1px' }}>⏭</span>
        </Button>
        <Button
          variant="secondary"
          onClick={() => onSeek(100)}
          className="frame-btn"
        >
          <svg width="16" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 1.5l10.5 6.5-10.5 6.5V1.5zM10 8l0-6h4v12h-4L10 8z"/>
          </svg>
        </Button>
      </div>
    </div>
  );
}
