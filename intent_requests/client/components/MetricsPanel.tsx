import { useState, memo } from 'react';
import { DatasetRow, FilterState, FilterType, ReviewStatusFilter } from '../types';
import { useFilteredMetrics } from '../hooks/useFilteredMetrics';
import { FilterBadgeList } from './FilterBadgeList';
import type { ParsedRowData } from '../hooks/useParsedRowCache';
import './MetricsPanel.css';

interface MetricsPanelProps {
  rows: DatasetRow[];
  reviewedRows: Set<number>;
  filter: FilterState;
  parsedCache: Map<DatasetRow, ParsedRowData>;
  onFilterChange: (filter: FilterState) => void;
  onRemoveFilter: (type: FilterType, value: string) => void;
  onClearAll: () => void;
}

export const MetricsPanel = memo(function MetricsPanel({ rows, reviewedRows, filter, parsedCache, onFilterChange, onRemoveFilter, onClearAll }: MetricsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);

  // Use filtered metrics hook that shows both total and filtered counts
  const metrics = useFilteredMetrics(rows, filter, parsedCache);

  const handlePromptClick = (promptName: string) => {
    const newPrompts = new Set(filter.prompts);

    // Toggle: if prompt is active, remove it; otherwise add it
    if (newPrompts.has(promptName)) {
      newPrompts.delete(promptName);
    } else {
      newPrompts.add(promptName);
    }

    onFilterChange({
      ...filter,
      prompts: newPrompts,
    });
  };

  const handleActionClick = (actionType: string) => {
    const newActions = new Set(filter.actions);

    // Toggle: if action is active, remove it; otherwise add it
    if (newActions.has(actionType)) {
      newActions.delete(actionType);
    } else {
      newActions.add(actionType);
    }

    onFilterChange({
      ...filter,
      actions: newActions,
    });
  };

  const handleReviewStatusClick = (status: ReviewStatusFilter) => {
    const newReviewStatus = new Set(filter.reviewStatus);

    // Toggle: if status is active, remove it; otherwise add it
    if (newReviewStatus.has(status)) {
      newReviewStatus.delete(status);
    } else {
      newReviewStatus.add(status);
    }

    onFilterChange({
      ...filter,
      reviewStatus: newReviewStatus,
    });
  };

  const isReviewStatusActive = (status: ReviewStatusFilter) => {
    return filter.reviewStatus.has(status);
  };

  const isPromptActive = (promptName: string) => {
    return filter.prompts.has(promptName);
  };

  const isActionActive = (actionType: string) => {
    return filter.actions.has(actionType);
  };

  return (
    <div className={`metrics-panel ${isCollapsed ? 'metrics-panel--collapsed' : ''}`}>
      <div className="metrics-panel__header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3 className="metrics-panel__title">Filters</h3>
        <button className="metrics-panel__toggle" aria-label="Toggle metrics">
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
        <div className="metrics-panel__content">
          <div className="metrics-panel__filters">
            <FilterBadgeList
              filter={filter}
              onRemoveFilter={onRemoveFilter}
              onClearAll={onClearAll}
            />
          </div>
          <div className="metrics-panel__breakdown">
            <div className="metrics-panel__section">
              <h4 className="metrics-panel__subtitle">Prompts</h4>
              <div className="breakdown-list">
                {Object.entries(metrics.promptCounts)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .slice(0, showAllPrompts ? undefined : 20)
                  .map(([prompt, count]) => (
                    <div
                      key={prompt}
                      className={`breakdown-item ${isPromptActive(prompt) ? 'breakdown-item--active' : ''}`}
                      onClick={() => handlePromptClick(prompt)}
                    >
                      <span className="breakdown-item__name" title={prompt || '(empty)'}>
                        {prompt || '(empty)'}
                      </span>
                      <span className="breakdown-item__count">
                        {count.filtered} / {count.total}
                      </span>
                    </div>
                  ))}
              </div>
              {Object.keys(metrics.promptCounts).length > 20 && (
                <button
                  className="breakdown-list__show-more"
                  onClick={() => setShowAllPrompts(!showAllPrompts)}
                >
                  {showAllPrompts ? 'Show Less' : `Show ${Object.keys(metrics.promptCounts).length - 20} More`}
                </button>
              )}
            </div>

            <div className="metrics-panel__section">
              <h4 className="metrics-panel__subtitle">Actions</h4>
              {Object.keys(metrics.actionCounts).length > 0 ? (
                <>
                  <div className="breakdown-list">
                    {Object.entries(metrics.actionCounts)
                      .sort(([, a], [, b]) => b.total - a.total)
                      .slice(0, showAllActions ? undefined : 20)
                      .map(([action, count]) => (
                        <div
                          key={action}
                          className={`breakdown-item ${isActionActive(action) ? 'breakdown-item--active' : ''}`}
                          onClick={() => handleActionClick(action)}
                        >
                          <span className="breakdown-item__name" title={action}>
                            {action}
                          </span>
                          <span className="breakdown-item__count">
                            {count.filtered} / {count.total}
                          </span>
                        </div>
                      ))}
                  </div>
                  {Object.keys(metrics.actionCounts).length > 20 && (
                    <button
                      className="breakdown-list__show-more"
                      onClick={() => setShowAllActions(!showAllActions)}
                    >
                      {showAllActions ? 'Show Less' : `Show ${Object.keys(metrics.actionCounts).length - 20} More`}
                    </button>
                  )}
                </>
              ) : (
                <div className="breakdown-empty">No actions found in outputs</div>
              )}
            </div>

            <div className="metrics-panel__section">
              <h4 className="metrics-panel__subtitle">Review Status</h4>
              <div className="breakdown-list">
                <div
                  className={`breakdown-item ${isReviewStatusActive('reviewed') ? 'breakdown-item--active' : ''}`}
                  onClick={() => handleReviewStatusClick('reviewed')}
                >
                  <span className="breakdown-item__name">Reviewed</span>
                  <span className="breakdown-item__count">
                    {metrics.reviewedCount.filtered} / {metrics.reviewedCount.total}
                  </span>
                </div>
                <div
                  className={`breakdown-item ${isReviewStatusActive('not-reviewed') ? 'breakdown-item--active' : ''}`}
                  onClick={() => handleReviewStatusClick('not-reviewed')}
                >
                  <span className="breakdown-item__name">Not Reviewed</span>
                  <span className="breakdown-item__count">
                    {metrics.notReviewedCount.filtered} / {metrics.notReviewedCount.total}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
