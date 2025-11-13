import { FilterState, FilterType, hasActiveFilters } from '../types';
import './FilterBadgeList.css';

interface FilterBadgeListProps {
  filter: FilterState;
  onRemoveFilter: (type: FilterType, value: string) => void;
  onClearAll: () => void;
}

export function FilterBadgeList({ filter, onRemoveFilter, onClearAll }: FilterBadgeListProps) {
  if (!hasActiveFilters(filter)) {
    return null;
  }

  // Collect all active filters
  const activeFilters: Array<{ type: FilterType; value: string }> = [];

  filter.prompts.forEach((prompt) => {
    activeFilters.push({ type: 'prompt', value: prompt });
  });

  filter.actions.forEach((action) => {
    activeFilters.push({ type: 'action', value: action });
  });

  return (
    <div className="filter-badge-list">
      {activeFilters.map(({ type, value }) => (
        <div key={`${type}-${value}`} className="filter-badge">
          <span className="filter-badge__label">
            {type === 'prompt' ? 'Prompt' : 'Action'}:
          </span>
          <span className="filter-badge__value">{value}</span>
          <button
            className="filter-badge__clear"
            onClick={() => onRemoveFilter(type, value)}
            aria-label={`Remove ${type} filter: ${value}`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}

      {activeFilters.length > 1 && (
        <button
          className="filter-badge-list__clear-all"
          onClick={onClearAll}
          aria-label="Clear all filters"
        >
          Clear All
        </button>
      )}
    </div>
  );
}
