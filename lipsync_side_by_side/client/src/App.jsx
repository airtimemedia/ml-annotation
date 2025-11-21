import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { ComparisonProvider, useComparison } from './context/ComparisonContext';
import ConfigUpload from './components/ConfigUpload';
import ComparisonView from './components/video/ComparisonView';
import ResultsView from './components/ResultsView';
import ProgressBar from './components/ui/ProgressBar';
import './App.css';

// Component to handle batch video routes
function BatchVideoRoute() {
  const { batchId: urlBatchId, index: urlIndex } = useParams();
  const navigate = useNavigate();
  const { config, batchId, comparisons, currentIndex, isComplete, goToIndex, mode } = useComparison();

  // Sync URL with state ONLY when URL params change (not when currentIndex changes)
  useEffect(() => {
    if (!config || !batchId) {
      // No config loaded, redirect to home
      navigate('/', { replace: true });
      return;
    }

    // Check if batch ID matches
    if (urlBatchId !== batchId) {
      // Wrong batch ID, redirect to current batch
      navigate(`/batch/${batchId}/video/${currentIndex}`, { replace: true });
      return;
    }

    // Parse and validate index
    const parsedIndex = parseInt(urlIndex, 10);
    if (isNaN(parsedIndex) || parsedIndex < 0 || parsedIndex >= comparisons.length) {
      // Invalid index, redirect to current index
      navigate(`/batch/${batchId}/video/${currentIndex}`, { replace: true });
      return;
    }

    // Update state if URL index is different from current index
    if (parsedIndex !== currentIndex) {
      goToIndex(parsedIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlBatchId, urlIndex]); // Only depend on URL params, not currentIndex

  // Redirect to results if complete (only in eval mode)
  if (isComplete && mode === 'eval') {
    return <Navigate to="/results" replace />;
  }

  if (!config) {
    return null; // Will redirect in useEffect
  }

  const completedIndices = Array.from({ length: currentIndex }, (_, i) => i);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>Lipsync Comparison</h1>
          <div className="header-actions">
            <ModeToggleButton />
            <ExitButton />
          </div>
        </div>
      </header>

      {mode === 'eval' && (
        <ProgressBar
          total={comparisons.length}
          current={currentIndex}
          completed={completedIndices}
        />
      )}

      <ComparisonView />
    </div>
  );
}

// Component that syncs state changes to URL
function ComparisonNavigator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { batchId, currentIndex, isComplete } = useComparison();
  const prevIndexRef = useRef(currentIndex);

  // Navigate when currentIndex changes (from Next/Back buttons) - only if we're already on a batch route
  useEffect(() => {
    // Only navigate if we're already on a batch video route AND currentIndex actually changed
    const isOnBatchRoute = location.pathname.startsWith('/batch/');
    const indexChanged = prevIndexRef.current !== currentIndex;

    if (isOnBatchRoute && batchId && !isComplete && indexChanged) {
      navigate(`/batch/${batchId}/video/${currentIndex}`, { replace: true });
    }

    prevIndexRef.current = currentIndex;
  }, [currentIndex, batchId, isComplete, navigate, location.pathname]);

  return null;
}

// Exit button component that uses navigate
function ExitButton() {
  const navigate = useNavigate();
  const { reset } = useComparison();

  const handleExit = async () => {
    await reset();
    navigate('/', { replace: true });
  };

  return (
    <button onClick={handleExit} className="exit-btn">
      Exit
    </button>
  );
}

// Mode toggle button component
function ModeToggleButton() {
  const { mode, toggleMode } = useComparison();

  return (
    <button onClick={toggleMode} className="mode-toggle-btn" title="Click to toggle between Eval and Debug modes">
      {mode === 'eval' ? '🔒 Eval Mode (click to switch)' : '🔧 Debug Mode (click to switch)'}
    </button>
  );
}

// Home route
function HomeRoute() {
  const navigate = useNavigate();
  const { config, batchId, comparisons, currentIndex, isComplete, loadConfig, mode } = useComparison();

  // If session exists, redirect to current video
  useEffect(() => {
    if (config && batchId) {
      // In eval mode, check comparisons array; in debug mode, just check config
      if (mode === 'eval' && comparisons.length > 0 && !isComplete) {
        navigate(`/batch/${batchId}/video/${currentIndex}`, { replace: true });
      } else if (mode === 'debug') {
        navigate(`/batch/${batchId}/video/0`, { replace: true });
      } else if (isComplete && mode === 'eval') {
        navigate('/results', { replace: true });
      }
    }
  }, [config, batchId, comparisons.length, currentIndex, isComplete, navigate, mode]);

  return <ConfigUpload onConfigLoad={loadConfig} />;
}

// Results route
function ResultsRoute() {
  const { isComplete, config } = useComparison();
  const navigate = useNavigate();

  // Redirect if not complete
  useEffect(() => {
    if (!isComplete || !config) {
      navigate('/', { replace: true });
    }
  }, [isComplete, config, navigate]);

  if (!isComplete) {
    return null;
  }

  return <ResultsView />;
}

function App() {
  return (
    <BrowserRouter>
      <ComparisonProvider>
        <ComparisonNavigator />
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/batch/:batchId/video/:index" element={<BatchVideoRoute />} />
          <Route path="/results" element={<ResultsRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ComparisonProvider>
    </BrowserRouter>
  );
}

export default App;
