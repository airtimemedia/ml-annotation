import { useState, useEffect } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { AnnotationPanel } from './components/AnnotationPanel';
import { StatisticsPanel } from './components/StatisticsPanel';
import { ProgressBar } from './components/ProgressBar';
import { LoadingState } from './components/LoadingState';
import { useVideoData } from './hooks/useVideoData';
import { useAnnotations } from './hooks/useAnnotations';
import { useStatistics } from './hooks/useStatistics';
import type { VideoAnnotation } from './types';
import './App.css';

function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { videos, existingAnnotations, isLoading, error } = useVideoData();
  const { annotations, saveAnnotation, exportCSV } = useAnnotations(existingAnnotations);
  const statistics = useStatistics(videos, existingAnnotations, annotations);

  const currentVideo = videos[currentIndex];

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't trigger shortcuts when typing
      }

      switch (e.key) {
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, videos.length]);

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleJumpTo = (index: number) => {
    if (index >= 0 && index < videos.length) {
      setCurrentIndex(index);
    }
  };

  const handleAnnotationChange = (annotation: VideoAnnotation) => {
    saveAnnotation(annotation);
  };

  const handleExport = () => {
    exportCSV(videos);
  };

  if (isLoading) {
    return <LoadingState message="Loading video list and existing annotations..." />;
  }

  if (error) {
    return (
      <LoadingState
        message={`Error loading data: ${error}. Check console for details.`}
        isError
      />
    );
  }

  if (videos.length === 0) {
    return (
      <LoadingState
        message="No videos found in S3 CSV. The CSV may be empty or improperly formatted. Expected path: s3://cantina-testsets/LIPSYNC_V1/final_meta_ui.csv. Check browser console for details."
        isError
      />
    );
  }

  const currentAnnotation = {
    ...existingAnnotations[currentVideo.path],
    ...annotations[currentVideo.path],
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Video Annotation Tool</h1>

        <ProgressBar
          currentIndex={currentIndex}
          totalVideos={videos.length}
          currentPath={currentVideo.path}
          onJumpTo={handleJumpTo}
        />

        <StatisticsPanel statistics={statistics} onExport={handleExport} />

        <div className="video-annotation-container">
          <VideoPlayer videoUrl={currentVideo.url} />

          <AnnotationPanel
            annotation={currentAnnotation}
            onAnnotationChange={handleAnnotationChange}
            onPrevious={handlePrevious}
            onNext={handleNext}
            hasPrevious={currentIndex > 0}
            hasNext={currentIndex < videos.length - 1}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
