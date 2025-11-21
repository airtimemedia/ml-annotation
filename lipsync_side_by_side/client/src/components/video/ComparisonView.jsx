import { useEffect, useState } from 'react';
import { useComparison } from '../../context/ComparisonContext';
import Card from '../ui/Card';
import VideoControls from './VideoControls';
import Transcript from './Transcript';
import VideoNavigation from './VideoNavigation';
import VideoPlayer from './VideoPlayer';
import FocusButton from './FocusButton';
import FeedbackSection from './FeedbackSection';
import useVideoSync from '../../hooks/useVideoSync';
import { generateWaveformFromVideo } from '../../utils/waveformGenerator';
import {
  API_BASE_URL,
  ENDPOINTS,
  INITIAL_RATING,
  INITIAL_ISSUES,
  MIN_VALID_RATING
} from '../../constants/index';
import './ComparisonView.css';

export default function ComparisonView() {
  const {
    config,
    comparisons,
    currentIndex,
    submitFeedback,
    goToPrevious,
    results,
    mode,
    selectedVideoIndex,
    setSelectedVideoIndex,
    selectedLeftModel,
    setSelectedLeftModel,
    selectedRightModel,
    setSelectedRightModel
  } = useComparison();

  // Feedback state
  const [video1Rating, setVideo1Rating] = useState(INITIAL_RATING);
  const [video2Rating, setVideo2Rating] = useState(INITIAL_RATING);
  const [video1Issues, setVideo1Issues] = useState(INITIAL_ISSUES);
  const [video2Issues, setVideo2Issues] = useState(INITIAL_ISSUES);
  const [preferred, setPreferred] = useState('');

  // Transcript state
  const [video1Transcript, setVideo1Transcript] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptsRequested, setTranscriptsRequested] = useState(false);
  const [transcriptError, setTranscriptError] = useState(null);

  // UI state
  const [focusedVideo, setFocusedVideo] = useState(null); // null, 1, or 2
  const [clientWaveform, setClientWaveform] = useState([]); // Client-generated waveform

  // Debug mode: processed video URLs
  const [debugVideoUrls, setDebugVideoUrls] = useState([null, null]);
  const [debugTranscripts, setDebugTranscripts] = useState([null, null]);
  const [isLoadingDebugVideos, setIsLoadingDebugVideos] = useState(false);

  // Mode-specific comparison logic
  const currentComparison = mode === 'eval'
    ? comparisons[currentIndex]
    : (config && config[selectedVideoIndex] ? {
        videoName: config[selectedVideoIndex].video_name,
        videoIndex: selectedVideoIndex,
        modelPair: [selectedLeftModel, selectedRightModel],
        originalUrls: [
          config[selectedVideoIndex].models[selectedLeftModel],
          config[selectedVideoIndex].models[selectedRightModel]
        ],
        videos: debugVideoUrls,
        waveforms: [null, null],
        transcripts: debugTranscripts,
        isProcessing: isLoadingDebugVideos,
        swapped: false,
        labels: [selectedLeftModel, selectedRightModel],
        modelMapping: {
          [selectedLeftModel]: selectedLeftModel,
          [selectedRightModel]: selectedRightModel
        }
      } : null);

  // Apply swap at display time (only in eval mode, debug mode never swaps)
  const leftVideoUrl = currentComparison?.swapped ? currentComparison.videos[1] : currentComparison.videos[0];
  const rightVideoUrl = currentComparison?.swapped ? currentComparison.videos[0] : currentComparison.videos[1];

  // Show real names in debug mode, fake names in eval mode
  const leftVideoLabel = mode === 'debug'
    ? selectedLeftModel
    : currentComparison?.labels[0];
  const rightVideoLabel = mode === 'debug'
    ? selectedRightModel
    : currentComparison?.labels[1];

  // Audio, waveform, and transcript always come from the LEFT (first displayed) video
  const leftWaveform = currentComparison?.swapped ? currentComparison.waveforms?.[1] : currentComparison.waveforms?.[0];
  const leftTranscript = currentComparison?.swapped ? currentComparison.transcripts?.[1] : currentComparison.transcripts?.[0];

  const {
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
  } = useVideoSync(leftVideoUrl, rightVideoUrl);

  const waveformData = leftWaveform || clientWaveform || [];

  // Debug mode: Load videos when selection changes
  useEffect(() => {
    if (mode !== 'debug' || !config || !config[selectedVideoIndex]) return;

    const leftUrl = config[selectedVideoIndex].models[selectedLeftModel];
    const rightUrl = config[selectedVideoIndex].models[selectedRightModel];

    if (!leftUrl || !rightUrl) return;

    let cancelled = false;
    setIsLoadingDebugVideos(true);

    const loadDebugVideos = async () => {
      try {
        console.log('[Debug Mode] Loading videos:', { leftUrl, rightUrl });

        // First, get videos quickly (skip processing)
        const [response1, response2] = await Promise.all([
          fetch(`${API_BASE_URL}${ENDPOINTS.PROCESS_VIDEO}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_url: leftUrl,
              skip_processing: true
            })
          }),
          fetch(`${API_BASE_URL}${ENDPOINTS.PROCESS_VIDEO}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_url: rightUrl,
              skip_processing: true
            })
          })
        ]);

        if (cancelled) return;

        if (!response1.ok || !response2.ok) {
          const error1 = !response1.ok ? await response1.text() : null;
          const error2 = !response2.ok ? await response2.text() : null;
          console.error('[Debug Mode] Error responses:', {
            response1Status: response1.status,
            response2Status: response2.status,
            error1,
            error2
          });
          throw new Error(`Failed to load videos - status: ${response1.status}, ${response2.status}`);
        }

        const [data1, data2] = await Promise.all([
          response1.json(),
          response2.json()
        ]);

        if (cancelled) return;

        const toAbsoluteUrl = (url) => {
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
          }
          return `${API_BASE_URL}${url}`;
        };

        setDebugVideoUrls([
          toAbsoluteUrl(data1.video_url),
          toAbsoluteUrl(data2.video_url)
        ]);
        setIsLoadingDebugVideos(false);

        console.log('[Debug Mode] Videos loaded successfully');

        // Then fetch transcripts in the background (async)
        fetch(`${API_BASE_URL}${ENDPOINTS.PROCESS_VIDEO}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_url: leftUrl,
            skip_processing: false
          })
        })
          .then(r => r.json())
          .then(data => {
            if (!cancelled) {
              setDebugTranscripts(prev => [data.transcript, prev[1]]);
              console.log('[Debug Mode] Left transcript loaded');
            }
          })
          .catch(err => console.error('[Debug Mode] Failed to load left transcript:', err));

      } catch (error) {
        if (cancelled) return;
        console.error('[Debug Mode] Failed to load videos:', error);
        setDebugVideoUrls([null, null]);
        setDebugTranscripts([null, null]);
        setIsLoadingDebugVideos(false);
      }
    };

    loadDebugVideos();

    return () => {
      cancelled = true;
    };
  }, [mode, config, selectedVideoIndex, selectedLeftModel, selectedRightModel]);

  // Reset video position immediately when navigating to a new comparison
  useEffect(() => {
    reset();
    setClientWaveform([]); // Reset client waveform
  }, [currentIndex, reset]);

  // Generate waveform client-side when video loads (if server didn't provide one)
  useEffect(() => {
    if (!leftWaveform && video1Ref.current && leftVideoUrl) {
      const video = video1Ref.current;

      const handleCanPlay = async () => {
        console.log('[Waveform] Generating client-side waveform...');
        const waveform = await generateWaveformFromVideo(video, 500);
        setClientWaveform(waveform);
        console.log('[Waveform] Client-side waveform generated');
      };

      // Check if video is already loaded
      if (video.readyState >= 3) {
        handleCanPlay();
      } else {
        video.addEventListener('canplay', handleCanPlay, { once: true });
        return () => video.removeEventListener('canplay', handleCanPlay);
      }
    }
  }, [leftVideoUrl, leftWaveform, video1Ref]);

  // Load transcript for the left (displayed first) video
  useEffect(() => {
    if (leftTranscript) {
      setVideo1Transcript(leftTranscript);
      setTranscriptsRequested(true);
      setIsTranscribing(false);
    } else {
      setVideo1Transcript(null);
      setTranscriptsRequested(false);
      setIsTranscribing(false);
    }
    setFocusedVideo(null);
  }, [currentIndex, leftTranscript]);

  // Restore previous results when going back
  useEffect(() => {
    if (results[currentIndex]) {
      const previousResult = results[currentIndex];
      setVideo1Rating(previousResult.video1.rating);
      setVideo2Rating(previousResult.video2.rating);
      setVideo1Issues(previousResult.video1.issues || []);
      setVideo2Issues(previousResult.video2.issues || []);
      setPreferred(previousResult.preferred);
    } else {
      setVideo1Rating(0);
      setVideo2Rating(0);
      setVideo1Issues([]);
      setVideo2Issues([]);
      setPreferred('');
    }
  }, [currentIndex, results]);

  // Auto-update preferred when ratings change
  useEffect(() => {
    if (video1Rating === INITIAL_RATING || video2Rating === INITIAL_RATING) return;

    if (video1Rating > video2Rating) {
      setPreferred(currentComparison.labels[0]);
    } else if (video2Rating > video1Rating) {
      setPreferred(currentComparison.labels[1]);
    }
  }, [video1Rating, video2Rating, currentComparison]);

  const handleSubmit = () => {
    submitFeedback({
      video1: { rating: video1Rating, issues: video1Issues },
      video2: { rating: video2Rating, issues: video2Issues },
      preferred
    });
  };

  const handleSkip = () => {
    submitFeedback({
      video1: { rating: 0, issues: [] },
      video2: { rating: 0, issues: [] },
      preferred: 'skipped'
    });
  };

  const handleFocus = (videoNum) => {
    setFocusedVideo(focusedVideo === videoNum ? null : videoNum);
  };

  const videosReady = leftVideoUrl && rightVideoUrl;
  const isValid = video1Rating >= MIN_VALID_RATING && video2Rating >= MIN_VALID_RATING && preferred && videosReady;

  // Auto-suggest preferred based on ratings
  const suggestedPreferred = (() => {
    if (video1Rating === INITIAL_RATING || video2Rating === INITIAL_RATING) return null;
    if (video1Rating > video2Rating) return currentComparison.labels[0];
    if (video2Rating > video1Rating) return currentComparison.labels[1];
    return null; // Tie
  })();

  if (!currentComparison) return null;

  return (
    <div className="comparison-container">
      {mode === 'eval' && <VideoNavigation />}

      {mode === 'debug' && config && (
        <div className="debug-controls" style={{ marginBottom: '1.5rem' }}>
          <div style={{ width: '50%', marginBottom: '1rem', paddingRight: '.5rem' }}>
            <label htmlFor="video-select" className="debug-label">
              Video
            </label>
            <select
              id="video-select"
              value={selectedVideoIndex}
              onChange={(e) => setSelectedVideoIndex(Number(e.target.value))}
              className="debug-select"
            >
              {config.map((video, idx) => (
                <option key={idx} value={idx}>
                  {video.video_name}
                </option>
              ))}
            </select>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <div>
              <label htmlFor="left-model-select" className="debug-label">
                Left Model
              </label>
              <select
                id="left-model-select"
                value={selectedLeftModel}
                onChange={(e) => setSelectedLeftModel(e.target.value)}
                className="debug-select"
              >
                {Object.keys(config[selectedVideoIndex]?.models || {}).map(model => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="right-model-select" className="debug-label">
                Right Model
              </label>
              <select
                id="right-model-select"
                value={selectedRightModel}
                onChange={(e) => setSelectedRightModel(e.target.value)}
                className="debug-select"
              >
                {Object.keys(config[selectedVideoIndex]?.models || {}).map(model => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div
        className="video-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: focusedVideo === 1 ? '1fr' : focusedVideo === 2 ? '1fr' : '1fr 1fr',
          transition: 'grid-template-columns 0.3s ease'
        }}
      >
        {/* Left Video */}
        {focusedVideo !== 2 && (
          <div className="video-wrapper" style={{
            position: 'relative'
          }}>
            <div className="video-label">
              {leftVideoLabel}
            </div>
            <FocusButton videoNum={1} focusedVideo={focusedVideo} onFocus={handleFocus} />
            {!leftVideoUrl ? (
              <div className="video-loading">
                <div className="spinner"></div>
                <p>Loading video...</p>
              </div>
            ) : (
              <VideoPlayer
                videoRef={video1Ref}
                videoUrl={leftVideoUrl}
              />
            )}
          </div>
        )}

        {/* Right Video */}
        {focusedVideo !== 1 && (
          <div className="video-wrapper" style={{
            position: 'relative'
          }}>
            <div className="video-label">
              {rightVideoLabel}
            </div>
            <FocusButton videoNum={2} focusedVideo={focusedVideo} onFocus={handleFocus} />
            {!rightVideoUrl ? (
              <div className="video-loading">
                <div className="spinner"></div>
                <p>Loading video...</p>
              </div>
            ) : (
              <VideoPlayer
                videoRef={video2Ref}
                videoUrl={rightVideoUrl}
                muted
              />
            )}
          </div>
        )}
      </div>

      {/* Controls Card */}
      <Card className="controls-card">
        {/* {!videosReady && (
          <div className="controls-loading-message">
            Loading videos...
          </div>
        )} */}
        <VideoControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          onPlayPause={togglePlayPause}
          onSeek={seekToPercent}
          onFrameStep={frameStep}
          onReset={reset}
          waveformData={waveformData}
        />
        <Transcript
          words={video1Transcript?.words}
          currentTime={currentTime}
          isLoading={isTranscribing}
          error={transcriptError}
          onSeek={seekTo}
        />
      </Card>

      {/* Feedback Card - Only show in eval mode */}
      {mode === 'eval' && (
        <Card className="feedback-card">
          <div className="feedback-grid">
            <FeedbackSection
              videoLabel={leftVideoLabel}
              rating={video1Rating}
              setRating={setVideo1Rating}
              issues={video1Issues}
              setIssues={setVideo1Issues}
              isPreferred={preferred === currentComparison.labels[0]}
              onPreferredClick={() => setPreferred(preferred === currentComparison.labels[0] ? '' : currentComparison.labels[0])}
              suggestedPreferred={suggestedPreferred === currentComparison.labels[0]}
            />
            <FeedbackSection
              videoLabel={rightVideoLabel}
              rating={video2Rating}
              setRating={setVideo2Rating}
              issues={video2Issues}
              setIssues={setVideo2Issues}
              isPreferred={preferred === currentComparison.labels[1]}
              onPreferredClick={() => setPreferred(preferred === currentComparison.labels[1] ? '' : currentComparison.labels[1])}
              suggestedPreferred={suggestedPreferred === currentComparison.labels[1]}
            />
          </div>

          <div className="feedback-actions">
            {currentIndex > 0 && (
              <button onClick={goToPrevious} className="back-btn">
                ← Back
              </button>
            )}
            <div className="right-actions">
              <button onClick={handleSkip} className="skip-btn" disabled={!videosReady}>
                Skip
              </button>
              <button onClick={handleSubmit} disabled={!isValid} className="submit-btn">
                {currentIndex === comparisons.length - 1 ? 'Submit' : 'Next'}
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
