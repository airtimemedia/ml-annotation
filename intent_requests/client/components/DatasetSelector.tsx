import { useState, useEffect, useRef } from 'react';
import './DatasetSelector.css';
import datasetsJson from '../data/datasets.json';

interface DatasetOption {
  id: string;
  name: string;
}

interface DatasetSelectorProps {
  currentDataset: string;
  onDatasetChange: (dataset: string) => void;
  disabled?: boolean;
}

// Load datasets from JSON file
const AVAILABLE_DATASETS: string[] = datasetsJson;

export function DatasetSelector({ currentDataset, onDatasetChange, disabled }: DatasetSelectorProps) {
  const [inputValue, setInputValue] = useState(currentDataset);
  const [isEditing, setIsEditing] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [suggestions, setSuggestions] = useState<DatasetOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const justOpenedRef = useRef(false);

  // Filter datasets based on query
  const filterDatasets = (query: string = '') => {
    const filtered = AVAILABLE_DATASETS
      .filter(dataset =>
        query.length === 0 ||
        dataset.toLowerCase().includes(query.toLowerCase())
      )
      .map(dataset => ({
        id: dataset,
        name: dataset,
      }));

    setSuggestions(filtered);
  };

  // Handle input change with debounced search
  useEffect(() => {
    if (!isEditing && !isBrowsing) return;

    const timer = setTimeout(() => {
      filterDatasets(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, isEditing, isBrowsing]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ignore the click if we just opened the dropdown
      if (justOpenedRef.current) {
        justOpenedRef.current = false;
        return;
      }

      const clickedInside = containerRef.current && containerRef.current.contains(event.target as Node);

      if (!clickedInside) {
        setIsEditing(false);
        setIsBrowsing(false);
        setInputValue(currentDataset);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentDataset]);

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    justOpenedRef.current = true;
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleBrowse = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    justOpenedRef.current = true;
    setIsBrowsing(true);
    setIsEditing(true);
    filterDatasets();
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (dataset: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setInputValue(dataset);
    setIsEditing(false);
    setIsBrowsing(false);
    onDatasetChange(dataset);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleSelect(inputValue.trim());
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setIsBrowsing(false);
      setInputValue(currentDataset);
    }
  };

  const showDropdown = (isEditing || isBrowsing) && suggestions.length > 0;

  return (
    <div className="dataset-selector" ref={containerRef}>
      <div className="dataset-selector__input-wrapper">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="dataset-selector__input"
            placeholder="Cantina/dataset-name"
            disabled={disabled}
          />
        ) : (
          <button
            onClick={handleEdit}
            className="dataset-selector__display"
            disabled={disabled}
            title={currentDataset}
          >
            {currentDataset}
          </button>
        )}

        <button
          onClick={handleBrowse}
          className="dataset-selector__browse-button"
          disabled={disabled}
          title="Browse datasets"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M14 14L10 10M11.3333 6.66667C11.3333 9.244 9.244 11.3333 6.66667 11.3333C4.08934 11.3333 2 9.244 2 6.66667C2 4.08934 4.08934 2 6.66667 2C9.244 2 11.3333 4.08934 11.3333 6.66667Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {showDropdown && (
        <div ref={dropdownRef} className="dataset-selector__dropdown">
          <div className="dataset-selector__list">
            {suggestions.map((option) => (
              <button
                key={option.id}
                onClick={(e) => handleSelect(option.name, e)}
                className={`dataset-selector__option ${option.name === currentDataset ? 'dataset-selector__option--active' : ''}`}
              >
                <div className="dataset-selector__option-name">{option.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
