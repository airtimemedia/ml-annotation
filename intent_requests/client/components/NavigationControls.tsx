import { useState, useEffect } from 'react';
import { DatasetRow, FilterState, hasActiveFilters } from '../types';
import type { ParsedRowData } from '../hooks/useParsedRowCache';
import './NavigationControls.css';

interface NavigationControlsProps {
  currentIndex: number;
  totalRows: number;
  rows: DatasetRow[];
  parsedCache: Map<DatasetRow, ParsedRowData>;
  onJumpTo: (index: number) => void;
  reviewedRows: Set<number>;
  filter: FilterState;
}

export function NavigationControls({
  currentIndex,
  totalRows,
  rows,
  parsedCache,
  onJumpTo,
  reviewedRows,
  filter,
}: NavigationControlsProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [visibleCount, setVisibleCount] = useState(20);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [filter.prompts, filter.actions]);

  const getActionType = (row: DatasetRow): string => {
    const cached = parsedCache.get(row)!;
    if (cached.parseError) return 'invalid';
    return cached.parsedOutput?.action || 'unknown';
  };

  const rowMatchesFilter = (row: DatasetRow): boolean => {
    // No filters active - all rows match
    if (!hasActiveFilters(filter)) return true;

    let matches = true;

    // Check prompt filters (if any)
    if (filter.prompts.size > 0) {
      if (!filter.prompts.has(row.prompt_name)) {
        matches = false;
      }
    }

    // Check action filters (if any)
    if (matches && filter.actions.size > 0) {
      const actionType = getActionType(row);
      if (!filter.actions.has(actionType)) {
        matches = false;
      }
    }

    return matches;
  };

  // Skip expensive computations when collapsed
  const displayIndices = !isCollapsed
    ? (hasActiveFilters(filter)
        ? rows.map((row, i) => ({ row, originalIndex: i })).filter(({ row }) => rowMatchesFilter(row))
        : rows.map((row, i) => ({ row, originalIndex: i })))
    : [];

  // Only render first N rows for performance
  const visibleIndices = displayIndices.slice(0, visibleCount);
  const hasMore = visibleCount < displayIndices.length;

  const handleShowMore = () => {
    setVisibleCount(prev => prev + 20);
  };

  // Header title
  const headerTitle = hasActiveFilters(filter)
    ? `Filtered Rows${!isCollapsed ? ` (${displayIndices.length})` : ''}`
    : 'All Rows';

  return (
    <div className={`navigation-controls ${isCollapsed ? 'navigation-controls--collapsed' : ''}`}>
      <div className="navigation-controls__header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3 className="navigation-controls__title">
          {headerTitle}
        </h3>
        <button className="navigation-controls__toggle" aria-label="Toggle navigation">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <div className="navigation-controls__content">
          <div className="row-list">
            <div className="row-list__header">
              <span>Row</span>
              <span>Prompt</span>
              <span>Action</span>
              <span>Status</span>
            </div>
            <div className="row-list__body">
              {visibleIndices.map(({ row, originalIndex }) => (
                <div
                  key={originalIndex}
                  className={`row-list__item ${originalIndex === currentIndex ? 'active' : ''} ${
                    reviewedRows.has(originalIndex) ? 'reviewed' : ''
                  }`}
                  onClick={() => onJumpTo(originalIndex)}
                >
                  <span className="row-list__number">{originalIndex + 1}</span>
                  <span className="row-list__prompt" title={row.prompt_name}>
                    {row.prompt_name}
                  </span>
                  <span className="row-list__action" title={getActionType(row)}>
                    {getActionType(row)}
                  </span>
                  <span className="row-list__status">
                    {reviewedRows.has(originalIndex) ? '✓ Reviewed' : 'Not reviewed'}
                  </span>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="row-list__footer">
                <button onClick={handleShowMore} className="row-list__show-more">
                  Show Next 20 (showing {visibleCount} of {displayIndices.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
