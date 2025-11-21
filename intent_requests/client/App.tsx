import { useState, useEffect, useRef } from 'react';
import { AnnotationView } from './components/AnnotationView';
import { DatasetRow, Annotation } from './types';
import './App.css';

// In development, call Flask directly on port 5177
// In production, use relative URLs (same origin)
const API_BASE = import.meta.env.DEV ? 'http://localhost:5177' : '';

const DEFAULT_DATASET = 'Cantina/intent-full-data-20251106';
const DEFAULT_SPLIT = 'train';
const DATASET_STORAGE_KEY = 'annotation-tool-dataset';
const SPLIT_STORAGE_KEY = 'annotation-tool-split';

function App() {
  // Load dataset from URL → localStorage → default
  const getInitialDataset = (): string => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlDataset = urlParams.get('dataset');
    if (urlDataset) return urlDataset;

    const storedDataset = localStorage.getItem(DATASET_STORAGE_KEY);
    if (storedDataset) return storedDataset;

    return DEFAULT_DATASET;
  };

  // Load split from URL → localStorage → default
  const getInitialSplit = (): string => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSplit = urlParams.get('split');
    if (urlSplit) return urlSplit;

    const storedSplit = localStorage.getItem(SPLIT_STORAGE_KEY);
    if (storedSplit) return storedSplit;

    return DEFAULT_SPLIT;
  };

  const [dataset, setDataset] = useState<string>(getInitialDataset());
  const [split, setSplit] = useState<string>(getInitialSplit());
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    loadDataset();
  }, [dataset, split]);

  const loadDataset = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build URL with query params
      const baseUrl = `${API_BASE}/api/load-intent-data`;
      const params = new URLSearchParams();
      params.append('dataset', dataset);
      params.append('split', split);

      const response = await fetch(`${baseUrl}?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load dataset');
      }

      const data = await response.json();
      setRows(data.rows);

      // Save to localStorage
      localStorage.setItem(DATASET_STORAGE_KEY, dataset);
      localStorage.setItem(SPLIT_STORAGE_KEY, split);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDataset = async () => {
    // Debounce: Only refresh once every 2 seconds
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = window.setTimeout(async () => {
      if (isRefreshingRef.current) {
        console.log('Refresh already in progress, skipping');
        return;
      }

      isRefreshingRef.current = true;

      try {
        console.log(`Refreshing ${split} split from Hugging Face...`);
        const baseUrl = `${API_BASE}/api/load-intent-data`;
        const params = new URLSearchParams();
        params.append('dataset', dataset);
        params.append('split', split);
        params.append('refresh', 'true');

        const response = await fetch(`${baseUrl}?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to refresh dataset');
        }

        const data = await response.json();

        // Only update if the data actually changed (check count as quick proxy)
        if (data.count !== rows.length) {
          console.log('Dataset changed, updating rows');
          setRows(data.rows);
        } else {
          // Even if count is same, selectively update changed rows
          let hasChanges = false;
          const newRows = rows.map((row, i) => {
            const newRow = data.rows[i];
            if (newRow && JSON.stringify(row) !== JSON.stringify(newRow)) {
              hasChanges = true;
              return newRow;
            }
            return row;
          });

          if (hasChanges) {
            console.log('Some rows changed, updating');
            setRows(newRows);
          } else {
            console.log('No changes detected, skipping update');
          }
        }
      } catch (error) {
        console.error('Failed to refresh dataset:', error);
      } finally {
        isRefreshingRef.current = false;
      }
    }, 2000); // Wait 2 seconds after last navigation before refreshing
  };

  const handleAnnotationComplete = (annotations: Annotation[]) => {
    console.log('Annotations complete:', annotations);
  };

  const handleUpdateRow = (index: number, updatedRow: Partial<DatasetRow>) => {
    // Optimistic update: immediately update the row in local state
    setRows(prevRows => {
      const newRows = [...prevRows];
      newRows[index] = { ...newRows[index], ...updatedRow };
      return newRows;
    });
  };

  const handleDatasetChange = (newDataset: string) => {
    setDataset(newDataset);
    // loadDataset will be called automatically due to useEffect dependency
  };

  const handleSplitChange = (newSplit: string) => {
    setSplit(newSplit);
    // loadDataset will be called automatically due to useEffect dependency
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="app__loading">
          <div className="app__spinner"></div>
          <p>Loading dataset...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="app__error">
          <h2>Failed to load dataset</h2>
          <p>{error}</p>
          <button onClick={loadDataset} className="app__retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="app">
        <div className="app__error">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <AnnotationView
      rows={rows}
      dataset={dataset}
      split={split}
      isLoadingDataset={isLoading}
      onDatasetChange={handleDatasetChange}
      onSplitChange={handleSplitChange}
      onAnnotationComplete={handleAnnotationComplete}
      onRefreshDataset={refreshDataset}
      onUpdateRow={handleUpdateRow}
    />
  );
}

export default App;
