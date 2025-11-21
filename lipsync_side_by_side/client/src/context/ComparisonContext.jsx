import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  API_BASE_URL,
  ENDPOINTS,
  STORAGE_KEY,
  RANDOMIZATION_THRESHOLD,
  LABEL_RANDOM_MAX,
  LABEL_CHARS
} from '../constants/index';

const ComparisonContext = createContext();

function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparison must be used within ComparisonProvider');
  }
  return context;
}

export function ComparisonProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [mode, setMode] = useState('debug'); // 'eval' or 'debug'

  // Debug mode: manual selection
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [selectedLeftModel, setSelectedLeftModel] = useState('');
  const [selectedRightModel, setSelectedRightModel] = useState('');

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);

        // Validate session has new format (array config with modelPair)
        if (!Array.isArray(session.config) || !session.comparisons?.[0]?.modelPair) {
          console.log('Old session format detected, clearing...');
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        setConfig(session.config);
        setBatchId(session.batchId);
        setComparisons(session.comparisons);
        setCurrentIndex(session.currentIndex);
        setResults(session.results);
        setIsComplete(session.isComplete);
        setMode(session.mode || 'debug');
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save session to localStorage whenever state changes
  useEffect(() => {
    if (config && comparisons.length > 0) {
      const session = {
        config,
        batchId,
        comparisons,
        currentIndex,
        results,
        isComplete,
        mode
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [config, batchId, comparisons, currentIndex, results, isComplete, mode]);

  // Clear video cache when browser closes or tab is closed
  useEffect(() => {
    const clearCacheOnUnload = async () => {
      try {
        // Use sendBeacon for reliable delivery during page unload
        const url = `${API_BASE_URL}${ENDPOINTS.CLEAR_CACHE}`;
        navigator.sendBeacon(url);
      } catch (error) {
        console.error('Failed to clear cache on unload:', error);
      }
    };

    window.addEventListener('beforeunload', clearCacheOnUnload);

    return () => {
      window.removeEventListener('beforeunload', clearCacheOnUnload);
      // Also clear on component unmount
      clearCacheOnUnload();
    };
  }, []);

  const loadConfig = useCallback(async (configData) => {
    // Clear any existing session
    localStorage.removeItem(STORAGE_KEY);

    // Generate a unique batch ID
    const newBatchId = generateBatchId();

    setConfig(configData);
    setBatchId(newBatchId);

    if (mode === 'eval') {
      // EVAL MODE: Generate ALL round-robin combinations
      const comparisons = [];

      configData.forEach((video) => {
        const modelNames = Object.keys(video.models);

        // Generate all unique pairs
        for (let i = 0; i < modelNames.length; i++) {
          for (let j = i + 1; j < modelNames.length; j++) {
            const model1 = modelNames[i];
            const model2 = modelNames[j];
            const url1 = video.models[model1];
            const url2 = video.models[model2];

            if (!url1 || !url2) {
              console.warn(`Missing URLs for ${video.video_name}: ${model1} or ${model2}`);
              continue;
            }

            const swapped = Math.random() > RANDOMIZATION_THRESHOLD;
            const randomLabels = generateRandomLabels();

            comparisons.push({
              videoName: video.video_name,
              videoIndex: configData.indexOf(video),
              modelPair: [model1, model2],
              originalUrls: [url1, url2],
              videos: [null, null],
              waveforms: [null, null],
              transcripts: [null, null],
              isProcessing: false,
              swapped,
              labels: randomLabels,
              modelMapping: {
                [randomLabels[0]]: swapped ? model2 : model1,
                [randomLabels[1]]: swapped ? model1 : model2
              }
            });
          }
        }
      });

      if (comparisons.length === 0) {
        console.error('No comparisons generated');
        return;
      }

      const shuffled = shuffleArray(comparisons);
      setComparisons(shuffled);
      setCurrentIndex(0);
      setResults([]);
      setIsComplete(false);

      downloadOriginalVideosAtIndex(shuffled, 0, setComparisons);
      processTranscripts(shuffled, 0, setComparisons);

    } else {
      // DEBUG MODE: No pre-generated comparisons, user picks on the fly
      // Initialize with first video and first two models
      const firstVideo = configData[0];
      const models = Object.keys(firstVideo.models);

      setSelectedVideoIndex(0);
      setSelectedLeftModel(models.includes('ground-truth') ? 'ground-truth' : models[0]);
      setSelectedRightModel(models.includes('lipsync--flashsync') ? 'lipsync--flashsync' : (models[1] || models[0]));
      setComparisons([]);
      setCurrentIndex(0);
      setResults([]);
      setIsComplete(false);
    }
  }, [mode]);

  const submitFeedback = useCallback((feedback) => {
    const currentComparison = comparisons[currentIndex];

    // Add model mapping to the feedback
    const enrichedFeedback = {
      ...feedback,
      modelMapping: currentComparison.modelMapping
    };

    setResults(prev => {
      const newResults = [...prev];
      // If we're editing a previous comparison, update it; otherwise add new
      if (newResults[currentIndex]) {
        newResults[currentIndex] = enrichedFeedback;
      } else {
        newResults.push(enrichedFeedback);
      }
      return newResults;
    });

    const nextIndex = currentIndex + 1;
    if (nextIndex < comparisons.length) {
      setCurrentIndex(nextIndex);
      // Download videos fast for immediate playback
      downloadOriginalVideosAtIndex(comparisons, nextIndex, setComparisons);
      // Process asynchronously for transcripts (waveforms generated client-side)
      processTranscripts(comparisons, nextIndex, setComparisons);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, comparisons]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const goToIndex = useCallback((index) => {
    // Fill in any gaps with skipped results
    if (index > currentIndex) {
      setResults(prev => {
        const newResults = [...prev];
        for (let i = prev.length; i < index; i++) {
          newResults[i] = {
            video1: { rating: 0, issues: [] },
            video2: { rating: 0, issues: [] },
            preferred: 'skipped',
            modelMapping: comparisons[i]?.modelMapping
          };
        }
        return newResults;
      });
    }

    setCurrentIndex(index);
    // Download videos fast for immediate playback
    downloadOriginalVideosAtIndex(comparisons, index, setComparisons);
    // Process asynchronously for transcripts (waveforms generated client-side)
    processTranscripts(comparisons, index, setComparisons);
  }, [currentIndex, comparisons]);

  const reset = useCallback(async () => {
    // Clear video cache from Redis
    try {
      await fetch(`${API_BASE_URL}${ENDPOINTS.CLEAR_CACHE}`, {
        method: 'POST'
      });
      console.log('Video cache cleared');
    } catch (error) {
      console.error('Failed to clear video cache:', error);
    }

    setConfig(null);
    setBatchId(null);
    setComparisons([]);
    setCurrentIndex(0);
    setResults([]);
    setIsComplete(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const resumeEditing = useCallback(() => {
    setIsComplete(false);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'eval' ? 'debug' : 'eval');
  }, []);

  const value = {
    config,
    batchId,
    comparisons,
    currentIndex,
    results,
    isComplete,
    mode,
    selectedVideoIndex,
    setSelectedVideoIndex,
    selectedLeftModel,
    setSelectedLeftModel,
    selectedRightModel,
    setSelectedRightModel,
    loadConfig,
    submitFeedback,
    goToPrevious,
    goToIndex,
    reset,
    resumeEditing,
    toggleMode
  };

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
}

// Download original videos for immediate playback
async function downloadOriginalVideosAtIndex(comparisons, index, setComparisons) {
  const comparison = comparisons[index];

  if (!comparison || comparison.videos[0]) {
    return; // Already have videos
  }

  console.log(`[downloadOriginalVideosAtIndex] Downloading videos for index ${index}...`);

  try {
    // Request both videos with skip_processing=true (fast path)
    console.log(`[downloadOriginalVideosAtIndex] Fetching video 1: ${comparison.originalUrls[0]}`);
    console.log(`[downloadOriginalVideosAtIndex] Fetching video 2: ${comparison.originalUrls[1]}`);

    const [response1, response2] = await Promise.all([
      fetch(`${API_BASE_URL}${ENDPOINTS.PROCESS_VIDEO}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: comparison.originalUrls[0],
          skip_processing: true
        })
      }),
      fetch(`${API_BASE_URL}${ENDPOINTS.PROCESS_VIDEO}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: comparison.originalUrls[1],
          skip_processing: true
        })
      })
    ]);

    console.log(`[downloadOriginalVideosAtIndex] Response statuses: video1=${response1.status}, video2=${response2.status}`);

    if (!response1.ok || !response2.ok) {
      const error1 = !response1.ok ? await response1.text() : null;
      const error2 = !response2.ok ? await response2.text() : null;
      console.error(`[downloadOriginalVideosAtIndex] Error responses:`, { error1, error2 });
      throw new Error(`Failed to download videos - video1: ${response1.status}, video2: ${response2.status}`);
    }

    const [data1, data2] = await Promise.all([
      response1.json(),
      response2.json()
    ]);

    console.log(`[downloadOriginalVideosAtIndex] Videos ready for index ${index}`, {
      video1Url: data1.video_url,
      video2Url: data2.video_url
    });

    const toAbsoluteUrl = (url) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      return `${API_BASE_URL}${url}`;
    };

    // Populate videos
    setComparisons(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        videos: [
          toAbsoluteUrl(data1.video_url),
          toAbsoluteUrl(data2.video_url)
        ]
      };
      return updated;
    });

  } catch (error) {
    console.error(`[downloadOriginalVideosAtIndex] Failed for index ${index}:`, error);
    console.error(`[downloadOriginalVideosAtIndex] URLs were:`, {
      video1: comparison.originalUrls[0],
      video2: comparison.originalUrls[1]
    });
  }
}

// Process transcripts asynchronously (waveforms generated client-side)
async function processTranscripts(comparisons, index, setComparisons) {
  const comparison = comparisons[index];

  if (!comparison || comparison.isProcessing || comparison.transcripts[0]) {
    return; // Already processing or already have transcripts
  }

  console.log(`[processTranscripts] Processing transcripts for index ${index}...`);

  // Mark as processing
  setComparisons(prev => {
    const updated = [...prev];
    updated[index] = { ...updated[index], isProcessing: true };
    return updated;
  });

  try {
    // Process both videos in parallel to get transcripts only
    console.log(`[processTranscripts] Fetching transcript 1: ${comparison.originalUrls[0]}`);
    console.log(`[processTranscripts] Fetching transcript 2: ${comparison.originalUrls[1]}`);

    const [response1, response2] = await Promise.all([
      fetch(`${API_BASE_URL}${ENDPOINTS.PROCESS_VIDEO}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: comparison.originalUrls[0],
          skip_processing: false  // Get transcript (waveform is client-side)
        })
      }),
      fetch(`${API_BASE_URL}${ENDPOINTS.PROCESS_VIDEO}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: comparison.originalUrls[1],
          skip_processing: false  // Get transcript (waveform is client-side)
        })
      })
    ]);

    console.log(`[processTranscripts] Response statuses: video1=${response1.status}, video2=${response2.status}`);

    if (!response1.ok || !response2.ok) {
      const error1 = !response1.ok ? await response1.text() : null;
      const error2 = !response2.ok ? await response2.text() : null;
      console.error(`[processTranscripts] Error responses:`, { error1, error2 });
      throw new Error(`Failed to process transcripts - video1: ${response1.status}, video2: ${response2.status}`);
    }

    const [data1, data2] = await Promise.all([
      response1.json(),
      response2.json()
    ]);

    console.log(`[processTranscripts] Transcripts ready for index ${index}`, {
      transcript1: data1.transcript ? 'present' : 'MISSING',
      transcript2: data2.transcript ? 'present' : 'MISSING',
      data1: data1,
      data2: data2
    });

    // Update transcripts only (waveforms are client-generated)
    setComparisons(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        transcripts: [data1.transcript, data2.transcript],
        isProcessing: false
      };
      return updated;
    });

  } catch (error) {
    console.error(`[processTranscripts] Failed for index ${index}:`, error);
    console.error(`[processTranscripts] URLs were:`, {
      video1: comparison.originalUrls[0],
      video2: comparison.originalUrls[1]
    });
    setComparisons(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isProcessing: false };
      return updated;
    });
  }
}

// Utility functions
function generateBatchId() {
  // Generate a short unique ID based on timestamp and random string
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `${timestamp}-${randomStr}`;
}

function generateRandomLabels() {
  const num1 = Math.floor(Math.random() * LABEL_RANDOM_MAX);
  const num2 = Math.floor(Math.random() * LABEL_RANDOM_MAX);
  const prefix1 = LABEL_CHARS[Math.floor(Math.random() * LABEL_CHARS.length)] +
                   LABEL_CHARS[Math.floor(Math.random() * LABEL_CHARS.length)];
  const prefix2 = LABEL_CHARS[Math.floor(Math.random() * LABEL_CHARS.length)] +
                   LABEL_CHARS[Math.floor(Math.random() * LABEL_CHARS.length)];
  return [
    `${prefix1}-${num1}`,
    `${prefix2}-${num2}`
  ];
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Export hook for use in components
// eslint-disable-next-line react-refresh/only-export-components
export { useComparison };
