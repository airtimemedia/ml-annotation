import { useState } from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  currentIndex: number;
  totalVideos: number;
  currentPath: string;
  onJumpTo: (index: number) => void;
}

export function ProgressBar({
  currentIndex,
  totalVideos,
  currentPath,
  onJumpTo,
}: ProgressBarProps) {
  const [jumpValue, setJumpValue] = useState('');

  const handleJump = () => {
    const num = parseInt(jumpValue, 10);
    if (!isNaN(num) && num >= 1 && num <= totalVideos) {
      onJumpTo(num - 1); // Convert to 0-indexed
      setJumpValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJump();
    }
  };

  return (
    <div className="progress-bar">
      <div className="progress-bar__header">
        <div className="progress-bar__title">
          Video {currentIndex + 1} of {totalVideos}
        </div>
        <div className="progress-bar__jump">
          <label htmlFor="jumpToVideo">Jump to:</label>
          <input
            id="jumpToVideo"
            type="number"
            min="1"
            max={totalVideos}
            placeholder="#"
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button onClick={handleJump}>Go</button>
        </div>
      </div>
      <div className="progress-bar__footer">
        <div className="progress-bar__path">{currentPath}</div>
        <div className="progress-bar__status">● Auto-save enabled</div>
      </div>
    </div>
  );
}
