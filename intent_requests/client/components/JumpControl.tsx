import { useState, useEffect } from 'react';
import './JumpControl.css';

interface JumpControlProps {
  totalRows: number;
  currentRow: number; // Original row index (0-based)
  onJumpTo: (index: number) => void;
}

export function JumpControl({ totalRows, currentRow, onJumpTo }: JumpControlProps) {
  const [jumpValue, setJumpValue] = useState('');

  // Update placeholder when current row changes
  useEffect(() => {
    // Clear input when row changes (unless user is typing)
    if (jumpValue === '') {
      // No-op, just triggers a re-render with new placeholder
    }
  }, [currentRow, jumpValue]);

  const handleJump = () => {
    const num = parseInt(jumpValue, 10);
    if (!isNaN(num) && num >= 1 && num <= totalRows) {
      onJumpTo(num - 1);
      setJumpValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJump();
    }
  };

  return (
    <div className="jump-control">
      Row number:{' '}
      <input
        type="number"
        min="1"
        max={totalRows}
        value={jumpValue || currentRow + 1}
        onChange={(e) => setJumpValue(e.target.value)}
        onKeyPress={handleKeyPress}
        className="jump-control__input"
      />
      <button onClick={handleJump} className="jump-control__button">
        Go
      </button>
    </div>
  );
}
