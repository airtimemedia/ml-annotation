import { useState, useEffect, useRef } from 'react';
import { DatasetRow, Annotation, FilterState, FilterType, hasActiveFilters } from '@/types';
import { MetricsPanel } from './MetricsPanel';
import { NavigationControls } from './NavigationControls';
import { JumpControl } from './JumpControl';
import { FilterBadgeList } from './FilterBadgeList';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { useFilteredRows } from '../hooks/useFilteredRows';
import { useUrlState } from '../hooks/useUrlState';
import { useParsedRowCache } from '../hooks/useParsedRowCache';
import './AnnotationView.css';

// In development, call Flask directly on port 5177
// In production, use relative URLs (same origin)
const API_BASE = import.meta.env.DEV ? 'http://localhost:5177' : '';

interface AnnotationViewProps {
  rows: DatasetRow[];
  onAnnotationComplete: (annotations: Annotation[]) => void;
  onRefreshDataset: () => Promise<void>;
}

export function AnnotationView({ rows, onAnnotationComplete, onRefreshDataset }: AnnotationViewProps) {
  // Create parsed cache ONCE at the top level
  const parsedCache = useParsedRowCache(rows);
  // URL state management
  const { parseUrl, updateUrl, onPopState } = useUrlState();
  const isInitialized = useRef(false);
  const isLoadingFromUrl = useRef(false);

  // Core state: Store the original row index as source of truth
  const [currentOriginalIndex, setCurrentOriginalIndex] = useState(0);
  const [filter, setFilter] = useState<FilterState>({
    prompts: new Set(),
    actions: new Set(),
  });

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [editedInput, setEditedInput] = useState('');
  const [editedOutput, setEditedOutput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [reviewedRows, setReviewedRows] = useState<Set<number>>(new Set());

  // Modal state for unsaved changes
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Get filtered rows and index mappings
  const { filteredRows, mapOriginalToFiltered } = useFilteredRows(rows, filter, parsedCache);

  // Derive filtered index from original index
  const currentFilteredIndex = mapOriginalToFiltered(currentOriginalIndex) ?? 0;
  const currentRow = filteredRows[currentFilteredIndex];

  // Initialize from URL on mount
  useEffect(() => {
    if (!isInitialized.current && rows.length > 0) {
      isLoadingFromUrl.current = true;

      const urlState = parseUrl();

      // Set state from URL
      setFilter(urlState.filters);
      if (urlState.rowIndex !== null && urlState.rowIndex >= 0 && urlState.rowIndex < rows.length) {
        setCurrentOriginalIndex(urlState.rowIndex);
      }

      isInitialized.current = true;

      // Clear loading flag after state updates have been processed
      requestAnimationFrame(() => {
        isLoadingFromUrl.current = false;
      });
    }
  }, [rows, parseUrl]);

  // Sync state to URL (after initialization)
  useEffect(() => {
    if (isInitialized.current && rows.length > 0) {
      updateUrl(currentOriginalIndex, filter);
    }
  }, [currentOriginalIndex, filter, rows.length, updateUrl]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const cleanup = onPopState((urlState) => {
      setFilter(urlState.filters);
      if (urlState.rowIndex !== null && urlState.rowIndex >= 0 && urlState.rowIndex < rows.length) {
        setCurrentOriginalIndex(urlState.rowIndex);
      }
    });

    return cleanup;
  }, [onPopState, rows.length]);

  // When filter changes, ensure current row is in filtered list
  // (skip during URL initialization to preserve the requested row)
  useEffect(() => {
    // Don't run during URL initialization
    if (isLoadingFromUrl.current || !isInitialized.current || filteredRows.length === 0) {
      return;
    }

    const isCurrentRowInFilteredList = filteredRows.some(row => rows.indexOf(row) === currentOriginalIndex);

    if (!isCurrentRowInFilteredList) {
      // Current row not in filtered list, jump to first filtered row
      const firstFilteredRow = filteredRows[0];
      if (firstFilteredRow) {
        setCurrentOriginalIndex(rows.indexOf(firstFilteredRow));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.prompts, filter.actions, filteredRows, rows]);

  // Update edited fields when current row changes
  useEffect(() => {
    if (currentRow) {
      setEditedPrompt(currentRow.prompt_name);
      setEditedInput(formatInput(currentRow.new_room_unified_format_input));
      // Format JSON output for better readability
      setEditedOutput(formatJSON(currentRow.unified_format_output_enriched_fixed));
    }
  }, [currentFilteredIndex, currentRow]);

  if (!currentRow) {
    return (
      <div className="annotation-view__empty">
        <p>No data to annotate</p>
      </div>
    );
  }

  const hasUnsavedChanges = () => {
    if (!currentRow) return false;
    return (
      editedPrompt !== currentRow.prompt_name ||
      editedInput !== formatInput(currentRow.new_room_unified_format_input) ||
      editedOutput !== formatJSON(currentRow.unified_format_output_enriched_fixed)
    );
  };

  const handleSave = () => {
    if (!hasUnsavedChanges()) {
      return; // No changes to save
    }

    // Mark as reviewed immediately (optimistic update)
    const newReviewedRows = new Set(reviewedRows);
    newReviewedRows.add(currentOriginalIndex);
    setReviewedRows(newReviewedRows);

    const annotation: Annotation = {
      prompt_name: editedPrompt,
      new_room_unified_format_input: editedInput,
      unified_format_output_enriched_fixed: editedOutput,
      reviewed: true,
      timestamp: Date.now(),
      last_updated: new Date().toISOString(),
    };

    const updatedAnnotations = [...annotations, annotation];
    setAnnotations(updatedAnnotations);

    // Show brief saving indicator
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 500);

    // Save to server in background (fire and forget)
    saveToServerAsync(annotation);

    // Trigger background refresh after save
    onRefreshDataset();
  };

  const saveToServerAsync = async (annotation: Annotation) => {
    try {
      const response = await fetch(`${API_BASE}/api/save-intent-annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          annotation,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save annotation');
      }

      const result = await response.json();
      console.log('Annotation saved successfully:', result);
    } catch (error) {
      console.error('Error saving annotation:', error);
      // Show non-intrusive error notification
      alert(`Warning: Save may have failed for ${annotation.prompt_name}. Please check your connection.`);
    }
  };

  const navigateWithCheck = (navigationFn: () => void) => {
    if (hasUnsavedChanges()) {
      setPendingNavigation(() => navigationFn);
      setShowUnsavedModal(true);
    } else {
      navigationFn();
      // Trigger background refresh after navigation
      onRefreshDataset();
    }
  };

  const confirmNavigation = () => {
    setShowUnsavedModal(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
      // Trigger background refresh after navigation
      onRefreshDataset();
    }
  };

  const cancelNavigation = () => {
    setShowUnsavedModal(false);
    setPendingNavigation(null);
  };

  const handleNext = () => {
    navigateWithCheck(() => {
      if (currentFilteredIndex < filteredRows.length - 1) {
        const nextRow = filteredRows[currentFilteredIndex + 1];
        setCurrentOriginalIndex(rows.indexOf(nextRow));
      }
    });
  };

  const handleNextRandom = () => {
    navigateWithCheck(() => {
      // Get unreviewed rows from filtered list
      const unreviewedRows = filteredRows.filter(row => {
        const originalIdx = rows.indexOf(row);
        return !reviewedRows.has(originalIdx);
      });

      if (unreviewedRows.length > 0) {
        // Pick a random unreviewed row
        const randomRow = unreviewedRows[Math.floor(Math.random() * unreviewedRows.length)];
        setCurrentOriginalIndex(rows.indexOf(randomRow));
      } else if (filteredRows.length > 0) {
        // All reviewed, just pick any random row
        const randomRow = filteredRows[Math.floor(Math.random() * filteredRows.length)];
        setCurrentOriginalIndex(rows.indexOf(randomRow));
      }
    });
  };

  const handlePrevious = () => {
    navigateWithCheck(() => {
      if (currentFilteredIndex > 0) {
        const prevRow = filteredRows[currentFilteredIndex - 1];
        setCurrentOriginalIndex(rows.indexOf(prevRow));
      }
    });
  };

  const handleJumpTo = (targetOriginalIndex: number) => {
    navigateWithCheck(() => {
      if (targetOriginalIndex >= 0 && targetOriginalIndex < rows.length) {
        setCurrentOriginalIndex(targetOriginalIndex);
      }
    });
  };

  const handleRemoveFilter = (type: FilterType, value: string) => {
    if (type === 'prompt') {
      const newPrompts = new Set(filter.prompts);
      newPrompts.delete(value);
      setFilter({
        prompts: newPrompts,
        actions: filter.actions,
      });
    } else if (type === 'action') {
      const newActions = new Set(filter.actions);
      newActions.delete(value);
      setFilter({
        prompts: filter.prompts,
        actions: newActions,
      });
    }
  };

  const handleClearAllFilters = () => {
    setFilter({
      prompts: new Set(),
      actions: new Set(),
    });
  };

  const formatJSON = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  };

  const formatInput = (input: string) => {
    // Format the structured input to be more readable
    try {
      // Replace JSON arrays/objects with formatted versions
      return input
        .replace(/ROOM MEMBERS:\s*(\[.*?\])/s, (match, json) => {
          try {
            const parsed = JSON.parse(json);
            return `ROOM MEMBERS:\n${JSON.stringify(parsed, null, 2)}`;
          } catch {
            return match;
          }
        })
        .replace(/CHAT HISTORY:\s*/g, '\n\nCHAT HISTORY:\n')
        .replace(/LAST MESSAGE:\s*/g, '\n\nLAST MESSAGE:\n')
        .replace(/OUTPUT:\s*/g, '\n\nOUTPUT:\n');
    } catch {
      return input;
    }
  };

  return (
    <div className="annotation-view">
      <header className="annotation-view__header">
        <div className="annotation-view__header-left">
          <h1>Intent Annotation</h1>
        </div>
        <div className="annotation-view__header-right">
          <JumpControl
            totalRows={rows.length}
            currentRow={currentOriginalIndex}
            onJumpTo={handleJumpTo}
          />
        </div>
      </header>

      <MetricsPanel
        rows={rows}
        reviewedRows={reviewedRows}
        filter={filter}
        parsedCache={parsedCache}
        onFilterChange={setFilter}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
      />

      <div className="annotation-view__main-panel">
        <div className="annotation-view__content">
          <div className="annotation-view__request-section">
            <h3 className="annotation-view__subsection-title">Input</h3>
            <textarea
              value={editedInput}
              onChange={(e) => setEditedInput(e.target.value)}
              className="annotation-view__textarea"
              spellCheck={false}
            />
          </div>

          <div className="annotation-view__annotation-section">
            <h3 className="annotation-view__section-title">Output</h3>
            <div className="annotation-view__field">
              <textarea
                id="output"
                value={editedOutput}
                onChange={(e) => setEditedOutput(e.target.value)}
                className="annotation-view__textarea"
                placeholder='{"action": "...", "requester": "...", "requested_users": [...], "action_metadata": {...}}'
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        <div className="annotation-view__actions">
          <button
            onClick={handlePrevious}
            disabled={currentFilteredIndex === 0 || isSaving}
            className="btn-secondary"
          >
            ← Previous
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-save"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleNext}
            disabled={currentFilteredIndex >= filteredRows.length - 1 || isSaving}
            className="btn-secondary"
          >
            Next →
          </button>
          <button
            onClick={handleNextRandom}
            disabled={isSaving}
            className="btn-secondary"
          >
            🎲 Random
          </button>
        </div>
      </div>

      <NavigationControls
        currentIndex={currentOriginalIndex}
        totalRows={rows.length}
        rows={rows}
        parsedCache={parsedCache}
        onJumpTo={handleJumpTo}
        reviewedRows={reviewedRows}
        filter={filter}
      />

      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </div>
  );
}
