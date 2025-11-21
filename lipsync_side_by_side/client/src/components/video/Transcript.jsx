import { useEffect, useRef, useState } from 'react';
import './Transcript.css';
import {
  NO_AUDIO_ERROR_TEXT,
  TRANSCRIPTION_MIN_TIME_SEC,
  TRANSCRIPTION_MAX_TIME_SEC,
  TIMELINE_PIXELS_PER_SECOND,
  CENTER_OFFSET_DIVISOR
} from '../../constants/index';

export default function Transcript({ words, currentTime, isLoading, error, onSeek }) {
  const containerRef = useRef(null);
  const activeWordRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Wait for container to be measured before showing content
  useEffect(() => {
    if (containerRef.current && words && words.length > 0) {
      // Use RAF to ensure DOM has been laid out
      requestAnimationFrame(() => {
        setIsReady(true);
      });
    } else {
      setIsReady(false);
    }
  }, [words]);

  if (error) {
    // Don't show anything for videos without audio
    if (error.includes(NO_AUDIO_ERROR_TEXT)) {
      return null;
    }
    // Show other errors
    return (
      <div className="transcript-container">
        <div className="transcript-error">
          ⚠️ {error}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="transcript-container">
        <div className="transcript-loading">
          <div className="loading-spinner" />
          <span>Loading transcript...</span>
        </div>
      </div>
    );
  }

  if (!words || words.length === 0) {
    return null; // Don't show anything while waiting for transcript to load
  }

  // Find the currently active word based on currentTime
  const activeWordIndex = words.findIndex((word, index) => {
    const nextWord = words[index + 1];
    return currentTime >= word.start && (!nextWord || currentTime < nextWord.start);
  });

  // Calculate timeline positioning
  // Scale: pixels per second - increased for more spacing between words
  const PIXELS_PER_SECOND = TIMELINE_PIXELS_PER_SECOND; // 300px = 1 second (lots of space!)
  const lastWord = words[words.length - 1];
  const timelineWidth = (lastWord?.end || 0) * PIXELS_PER_SECOND;

  // Calculate the scroll position to keep current time centered
  // padding-left: 100% creates blank space at the start, so at time=0, the first word is centered
  // As time increases, we scroll left, bringing future words to the center
  const scrollOffset = currentTime * PIXELS_PER_SECOND;

  // Generate second markers
  const totalSeconds = Math.ceil(lastWord?.end || 0);
  const secondMarkers = Array.from({ length: totalSeconds + 1 }, (_, i) => i);

  // Get container width to calculate center offset
  const containerWidth = containerRef.current?.offsetWidth || 0;
  const centerOffset = containerWidth / CENTER_OFFSET_DIVISOR;

  return (
    <div className="transcript-container" ref={containerRef}>
      {/* Only show content once we've measured the container */}
      {isReady && (
        <>
          {/* Playhead indicator - fixed in center */}
          <div className="playhead" />

          <div
            className="transcript-timeline"
            style={{
              width: `${timelineWidth}px`,
              // Start with center offset, then subtract scroll offset
              // This keeps the word at currentTime position centered
              transform: `translateX(${centerOffset - scrollOffset}px)`,
            }}
          >
            {/* Second markers */}
            {secondMarkers.map((second) => (
              <div
                key={`marker-${second}`}
                className="second-marker"
                style={{
                  position: 'absolute',
                  left: `${second * PIXELS_PER_SECOND}px`,
                }}
              >
                <div className="marker-line" />
                <div className="marker-label">{second}s</div>
              </div>
            ))}

            {/* Words */}
            {words.map((word, index) => {
              const isActive = index === activeWordIndex;
              const isPast = currentTime > word.end;

              // Position word at its timestamp
              // No offset needed - padding handles the initial centering
              const leftPosition = word.start * PIXELS_PER_SECOND;

              // Width is proportional to how long the word is spoken
              const duration = word.end - word.start;
              const wordWidth = duration * PIXELS_PER_SECOND;

              return (
                <span
                  key={index}
                  ref={isActive ? activeWordRef : null}
                  className={`transcript-word ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                  style={{
                    position: 'absolute',
                    left: `${leftPosition}px`,
                    width: `${wordWidth}px`,
                    cursor: onSeek ? 'pointer' : 'default',
                  }}
                  data-start={word.start}
                  data-end={word.end}
                  onClick={() => onSeek && onSeek(word.start)}
                  title={`Jump to ${word.start.toFixed(1)}s`}
                >
                  {word.text}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
