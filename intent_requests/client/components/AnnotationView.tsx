import { useState, useEffect, useRef } from 'react';
import { DatasetRow, Annotation, FilterState, FilterType, hasActiveFilters, ReviewStatusFilter } from '@/types';
import { MetricsPanel } from './MetricsPanel';
import { NavigationControls } from './NavigationControls';
import { JumpControl } from './JumpControl';
import { FilterBadgeList } from './FilterBadgeList';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { DatasetSelector } from './DatasetSelector';
import { useFilteredRows } from '../hooks/useFilteredRows';
import { useUrlState } from '../hooks/useUrlState';
import { useParsedRowCache } from '../hooks/useParsedRowCache';
import './AnnotationView.css';

// In development, call Flask directly on port 5177
// In production, use relative URLs (same origin)
const API_BASE = import.meta.env.DEV ? 'http://localhost:5177' : '';

interface AnnotationViewProps {
  rows: DatasetRow[];
  dataset: string;
  isLoadingDataset: boolean;
  onDatasetChange: (dataset: string) => void;
  onAnnotationComplete: (annotations: Annotation[]) => void;
  onRefreshDataset: () => Promise<void>;
  onUpdateRow: (index: number, updatedRow: Partial<DatasetRow>) => void;
}

export function AnnotationView({ rows, dataset, isLoadingDataset, onDatasetChange, onAnnotationComplete, onRefreshDataset, onUpdateRow }: AnnotationViewProps) {
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
    reviewStatus: new Set(),
  });

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [editedInput, setEditedInput] = useState('');
  const [editedOutput, setEditedOutput] = useState('');
  const [isManuallyReviewed, setIsManuallyReviewed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reviewedRows, setReviewedRows] = useState<Set<number>>(new Set());

  // Clone/Create mode state
  const [isCloneMode, setIsCloneMode] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [clonedFromData, setClonedFromData] = useState<{
    prompt: string;
    input: string;
    output: string;
  } | null>(null);

  // Modal state for unsaved changes
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Modal state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Refs for auto-scrolling textareas to bottom
  const inputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);

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
      updateUrl(currentOriginalIndex, filter, dataset);
    }
  }, [currentOriginalIndex, filter, dataset, rows.length, updateUrl]);

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
  }, [filter.prompts.size, filter.actions.size, filter.reviewStatus.size, filteredRows, rows]);

  // Update edited fields when current row changes (but not in clone/create mode)
  useEffect(() => {
    if (currentRow && !isCloneMode && !isCreateMode) {
      setEditedPrompt(currentRow.prompt_name);
      setEditedInput(formatInput(currentRow.input));
      // Format JSON output for better readability
      setEditedOutput(formatJSON(currentRow.output));
      setIsManuallyReviewed(currentRow.manually_reviewed || false);
    }
  }, [currentFilteredIndex, currentRow, isCloneMode, isCreateMode]);

  // Auto-scroll textareas to bottom when content changes
  useEffect(() => {
    if (inputTextareaRef.current) {
      inputTextareaRef.current.scrollTop = inputTextareaRef.current.scrollHeight;
    }
  }, [editedInput]);

  useEffect(() => {
    if (outputTextareaRef.current) {
      outputTextareaRef.current.scrollTop = outputTextareaRef.current.scrollHeight;
    }
  }, [editedOutput]);

  // Don't render main panel if no rows match filters, but keep the rest of the UI
  const hasFilteredRows = filteredRows.length > 0;

  const hasUnsavedChanges = () => {
    if (isCloneMode || isCreateMode) {
      // In clone/create mode, always has unsaved changes
      return true;
    }
    if (!currentRow) return false;
    return (
      editedPrompt !== currentRow.prompt_name ||
      editedInput !== formatInput(currentRow.input) ||
      editedOutput !== formatJSON(currentRow.output) ||
      isManuallyReviewed !== (currentRow.manually_reviewed || false)
    );
  };

  const hasCloneMadeChanges = () => {
    if (!isCloneMode || !clonedFromData) return false;
    return (
      editedPrompt !== clonedFromData.prompt ||
      editedInput !== clonedFromData.input ||
      editedOutput !== clonedFromData.output
    );
  };

  const hasCreateMadeChanges = () => {
    if (!isCreateMode) return false;
    return (
      editedPrompt.trim() !== '' ||
      editedInput.trim() !== '' ||
      editedOutput.trim() !== ''
    );
  };

  const handleSave = () => {
    if (isCloneMode) {
      // In clone mode, save as new row
      handleSaveClone();
      return;
    }

    if (isCreateMode) {
      // In create mode, save as new row
      handleSaveCreate();
      return;
    }

    if (!hasUnsavedChanges()) {
      return; // No changes to save
    }

    // Mark as reviewed immediately (optimistic update)
    const newReviewedRows = new Set(reviewedRows);
    newReviewedRows.add(currentOriginalIndex);
    setReviewedRows(newReviewedRows);

    const annotation: Annotation = {
      prompt_name: editedPrompt,
      input: editedInput,
      output: editedOutput,
      manually_reviewed: isManuallyReviewed,
      manually_reviewed_ts: isManuallyReviewed ? Date.now() : (currentRow.manually_reviewed_ts || null),
      last_updated_ts: new Date().toISOString(),
    };

    const updatedAnnotations = [...annotations, annotation];
    setAnnotations(updatedAnnotations);

    // Update the row in parent state immediately (optimistic update)
    onUpdateRow(currentOriginalIndex, {
      prompt_name: editedPrompt,
      input: editedInput,
      output: editedOutput,
      manually_reviewed: isManuallyReviewed,
      manually_reviewed_ts: isManuallyReviewed ? Date.now() : (currentRow.manually_reviewed_ts || 0),
      last_updated_ts: new Date().toISOString(),
    });

    // Show brief saving indicator
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 500);

    // Save to server in background (fire and forget)
    saveToServerAsync(annotation);

    // Trigger background refresh after save
    onRefreshDataset();
  };

  const handleSaveClone = async () => {
    if (!hasCloneMadeChanges()) {
      alert('Please make changes to the cloned row before saving to prevent duplicates.');
      return;
    }

    const newRow = {
      prompt_name: editedPrompt,
      input: editedInput,
      output: editedOutput,
      manually_reviewed: isManuallyReviewed,
      manually_reviewed_ts: isManuallyReviewed ? Date.now() : null,
      last_updated_ts: new Date().toISOString(),
    };

    // Show saving indicator
    setIsSaving(true);

    try {
      const response = await fetch(`${API_BASE}/api/create-intent-row`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          row: newRow,
          dataset,
          insert_after_index: currentOriginalIndex,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create row');
      }

      // Exit clone mode
      setIsCloneMode(false);
      setClonedFromData(null);

      // Refresh dataset to show new row
      await onRefreshDataset();

      // Navigate to the newly created row (next index after current)
      const newRowIndex = currentOriginalIndex + 1;
      setCurrentOriginalIndex(newRowIndex);

      alert('Row cloned successfully! Now viewing the new row.');
    } catch (error) {
      console.error('Error creating cloned row:', error);
      alert(`Failed to clone row: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCreate = async () => {
    if (!hasCreateMadeChanges()) {
      alert('Please fill in at least one field before saving.');
      return;
    }

    if (!editedPrompt.trim()) {
      alert('Prompt name is required.');
      return;
    }

    const newRow = {
      prompt_name: editedPrompt,
      input: editedInput,
      output: editedOutput,
      manually_reviewed: isManuallyReviewed,
      manually_reviewed_ts: isManuallyReviewed ? Date.now() : null,
      last_updated_ts: new Date().toISOString(),
    };

    // Show saving indicator
    setIsSaving(true);

    try {
      const response = await fetch(`${API_BASE}/api/create-intent-row`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          row: newRow,
          dataset,
          insert_after_index: currentOriginalIndex,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create row');
      }

      // Exit create mode
      setIsCreateMode(false);

      // Refresh dataset to show new row
      await onRefreshDataset();

      // Navigate to the newly created row (next index after current)
      const newRowIndex = currentOriginalIndex + 1;
      setCurrentOriginalIndex(newRowIndex);

      alert('Row created successfully! Now viewing the new row.');
    } catch (error) {
      console.error('Error creating row:', error);
      alert(`Failed to create row: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClone = () => {
    if (!currentRow) return;

    // Store the original data for comparison
    setClonedFromData({
      prompt: editedPrompt,
      input: editedInput,
      output: editedOutput,
    });

    // Enter clone mode
    setIsCloneMode(true);
  };

  const handleCreate = () => {
    // Clear all fields
    setEditedPrompt('');
    setEditedInput('');
    setEditedOutput('');
    setIsManuallyReviewed(false);

    // Enter create mode
    setIsCreateMode(true);
  };

  const handleCancelClone = () => {
    // Restore original row data
    if (currentRow) {
      setEditedPrompt(currentRow.prompt_name);
      setEditedInput(formatInput(currentRow.input));
      setEditedOutput(formatJSON(currentRow.output));
      setIsManuallyReviewed(currentRow.manually_reviewed || false);
    }

    // Exit clone mode
    setIsCloneMode(false);
    setClonedFromData(null);
  };

  const handleCancelCreate = () => {
    // Restore original row data
    if (currentRow) {
      setEditedPrompt(currentRow.prompt_name);
      setEditedInput(formatInput(currentRow.input));
      setEditedOutput(formatJSON(currentRow.output));
      setIsManuallyReviewed(currentRow.manually_reviewed || false);
    }

    // Exit create mode
    setIsCreateMode(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteModal(false);
    setIsSaving(true);

    try {
      const response = await fetch(`${API_BASE}/api/delete-intent-row`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          row_index: currentOriginalIndex,
          dataset,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete row');
      }

      // Refresh dataset to remove deleted row
      await onRefreshDataset();

      // Navigate to previous row if possible, otherwise stay at same index (which will be next row)
      if (currentOriginalIndex > 0) {
        setCurrentOriginalIndex(currentOriginalIndex - 1);
      } else if (rows.length > 1) {
        // If we deleted the first row, stay at index 0 (which will now be the next row)
        setCurrentOriginalIndex(0);
      }

      alert('Row deleted successfully!');
    } catch (error) {
      console.error('Error deleting row:', error);
      alert(`Failed to delete row: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
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
          dataset,
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
    // Don't allow navigation in clone/create mode
    if (isCloneMode) {
      alert('Please save or cancel the cloned row before navigating.');
      return;
    }
    if (isCreateMode) {
      alert('Please save or cancel the new row before navigating.');
      return;
    }

    if (hasUnsavedChanges()) {
      setPendingNavigation(() => navigationFn);
      setShowUnsavedModal(true);
    } else {
      navigationFn();
      // Trigger background refresh after navigation
      onRefreshDataset();
    }
  };

  const handleDatasetChangeWithCheck = (newDataset: string) => {
    // Don't allow dataset change in clone/create mode
    if (isCloneMode) {
      alert('Please save or cancel the cloned row before changing datasets.');
      return;
    }
    if (isCreateMode) {
      alert('Please save or cancel the new row before changing datasets.');
      return;
    }

    if (hasUnsavedChanges()) {
      setPendingNavigation(() => () => onDatasetChange(newDataset));
      setShowUnsavedModal(true);
    } else {
      onDatasetChange(newDataset);
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
        ...filter,
        prompts: newPrompts,
      });
    } else if (type === 'action') {
      const newActions = new Set(filter.actions);
      newActions.delete(value);
      setFilter({
        ...filter,
        actions: newActions,
      });
    } else if (type === 'reviewStatus') {
      const newReviewStatus = new Set(filter.reviewStatus);
      // Convert display label back to filter value
      const filterValue = value === 'Reviewed' ? 'reviewed' : 'not-reviewed';
      newReviewStatus.delete(filterValue as ReviewStatusFilter);
      setFilter({
        ...filter,
        reviewStatus: newReviewStatus,
      });
    }
  };

  const handleClearAllFilters = () => {
    setFilter({
      prompts: new Set(),
      actions: new Set(),
      reviewStatus: new Set(),
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

  const DATASET_VIEWER_URL = `https://huggingface.co/datasets/${dataset}/viewer?views%5B%5D=train`;

  return (
    <div className="annotation-view">
      <header className="annotation-view__header">
        <div className="annotation-view__header-left">
          <DatasetSelector
            currentDataset={dataset}
            onDatasetChange={handleDatasetChangeWithCheck}
            disabled={isLoadingDataset}
          />
          <a
            href={DATASET_VIEWER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="annotation-view__dataset-link"
            title="View dataset on HuggingFace"
          >
            View on HuggingFace →
          </a>
        </div>
        <div className="annotation-view__header-right">
          {hasFilteredRows && (
            <>
              <span className="annotation-view__filter-count">
                Showing {filteredRows.length} of {rows.length} rows
              </span>
              <JumpControl
                totalRows={rows.length}
                currentRow={currentOriginalIndex}
                onJumpTo={handleJumpTo}
              />
            </>
          )}
          {!hasFilteredRows && (
            <span className="annotation-view__filter-count">
              No rows match filters (0 of {rows.length})
            </span>
          )}
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

      {hasFilteredRows && (
        <div className="annotation-view__main-panel">
        {isCloneMode && (
          <div className="annotation-view__clone-banner">
            <div className="annotation-view__clone-banner-content">
              <span className="annotation-view__clone-banner-icon">📋</span>
              <div className="annotation-view__clone-banner-text">
                <strong>Clone Mode:</strong> You are creating a copy of this row. Please make changes before saving to prevent duplicates.
              </div>
              <button onClick={handleCancelClone} className="annotation-view__clone-banner-close">
                Cancel Clone
              </button>
            </div>
          </div>
        )}
        {isCreateMode && (
          <div className="annotation-view__create-banner">
            <div className="annotation-view__create-banner-content">
              <span className="annotation-view__create-banner-icon">✨</span>
              <div className="annotation-view__create-banner-text">
                <strong>Create Mode:</strong> You are creating a new row. Fill in the fields below.
              </div>
              <button onClick={handleCancelCreate} className="annotation-view__create-banner-close">
                Cancel Create
              </button>
            </div>
          </div>
        )}
        <div className="annotation-view__content">
          <div className="annotation-view__request-section">
            <h3 className="annotation-view__subsection-title">Input</h3>
            <textarea
              ref={inputTextareaRef}
              value={editedInput}
              onChange={(e) => setEditedInput(e.target.value)}
              className="annotation-view__textarea"
              placeholder={`ROOM MEMBERS:
[
  {
    "user_name": "Ravi",
    "full_name": "Ravi"
  },
  ...
]


CHAT HISTORY:
Username: ...
...


LAST MESSAGE:
Username: ...


OUTPUT:
`}
              spellCheck={false}
            />
            <div className="annotation-view__subsection-title">
              <label htmlFor="prompt-name">Prompt Name</label>
              <input
                id="prompt-name"
                type="text"
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="annotation-view__prompt-input"
                placeholder="Enter prompt name..."
                spellCheck={false}
              />
            </div>
          </div>

          <div className="annotation-view__annotation-section">
            <h3 className="annotation-view__section-title">Output</h3>
            <div className="annotation-view__field">
              <textarea
                ref={outputTextareaRef}
                id="output"
                value={editedOutput}
                onChange={(e) => setEditedOutput(e.target.value)}
                className="annotation-view__textarea"
                placeholder={`{
  "action": "...",
  "requester": "...",
  "requested_users": [...],
  "action_metadata": {...}
}`}
                spellCheck={false}
              />
            </div>
            <div className="annotation-view__reviewed-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={isManuallyReviewed}
                  onChange={(e) => setIsManuallyReviewed(e.target.checked)}
                />
                <span>Manually Reviewed</span>
              </label>
              <span className="annotation-view__reviewed-date">
                {!isCreateMode && currentRow?.manually_reviewed_ts && currentRow.manually_reviewed_ts !== 0
                  ? `Last reviewed: ${new Date(currentRow.manually_reviewed_ts).toLocaleString()}`
                  : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="annotation-view__actions">
          {!isCloneMode && !isCreateMode ? (
            <>
              <button
                onClick={handlePrevious}
                disabled={currentFilteredIndex === 0 || isSaving}
                className="btn-secondary"
              >
                ← Previous
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
              <div className="annotation-view__actions-spacer" />
              <button
                onClick={handleCreate}
                disabled={isSaving}
                className="btn-create"
              >
                ✨ Create
              </button>
              <button
                onClick={handleClone}
                disabled={isSaving}
                className="btn-clone"
              >
                📋 Clone
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-save"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={isSaving}
                className="btn-delete"
              >
                🗑️ Delete
              </button>
            </>
          ) : isCloneMode ? (
            <>
              <button
                onClick={handleCancelClone}
                disabled={isSaving}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasCloneMadeChanges()}
                className="btn-save"
                title={!hasCloneMadeChanges() ? 'Make changes before saving' : 'Save as new row'}
              >
                {isSaving ? 'Saving...' : 'Save Clone'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelCreate}
                disabled={isSaving}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editedPrompt.trim()}
                className="btn-save"
                title={!editedPrompt.trim() ? 'Prompt name is required' : 'Save new row'}
              >
                {isSaving ? 'Saving...' : 'Save New'}
              </button>
            </>
          )}
        </div>
      </div>
      )}

      {hasFilteredRows && (
        <NavigationControls
        currentIndex={currentOriginalIndex}
        totalRows={rows.length}
        rows={rows}
        parsedCache={parsedCache}
        onJumpTo={handleJumpTo}
        reviewedRows={reviewedRows}
        filter={filter}
      />
      )}

      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Row?</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this row? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button onClick={handleDeleteCancel} className="modal-button modal-button--cancel">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="modal-button modal-button--confirm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
