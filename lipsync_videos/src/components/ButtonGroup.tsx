import './ButtonGroup.css';

interface ButtonOption {
  label: string;
  value: string;
}

interface ButtonGroupProps {
  label: string;
  value: string;
  options: ButtonOption[];
  onChange: (value: string) => void;
}

export function ButtonGroup({ label, value, options, onChange }: ButtonGroupProps) {
  return (
    <div className="button-group-container">
      <label className="button-group-label">{label}:</label>
      <div className="button-group">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`button-choice ${value === option.value ? 'selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
