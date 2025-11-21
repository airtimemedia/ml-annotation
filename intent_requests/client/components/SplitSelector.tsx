import './SplitSelector.css';

interface SplitSelectorProps {
  currentSplit: string;
  onSplitChange: (split: string) => void;
  disabled?: boolean;
}

export function SplitSelector({ currentSplit, onSplitChange, disabled }: SplitSelectorProps) {
  const splits = ['train', 'test'];

  return (
    <div className="split-selector">
      <label className="split-selector__label">Split:</label>
      <select
        value={currentSplit}
        onChange={(e) => onSplitChange(e.target.value)}
        disabled={disabled}
        className="split-selector__select"
      >
        {splits.map((split) => (
          <option key={split} value={split}>
            {split}
          </option>
        ))}
      </select>
    </div>
  );
}
