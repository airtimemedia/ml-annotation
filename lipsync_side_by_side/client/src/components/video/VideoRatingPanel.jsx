import { useState } from 'react';
import { STAR_RATING_RANGE, SINGULAR_THRESHOLD, DROPDOWN_CLOSE_DELAY_MS } from '../../constants/index';
import './VideoRatingPanel.css';

const LIPSYNC_REASONS = [
  'No issues',
  'Mouth movements don\'t match audio timing',
  'Delayed or early lip movements',
  'Unnatural mouth shapes',
  'Inconsistent synchronization',
  'Audio and video drift over time',
  'Other quality issues'
];

export default function VideoRatingPanel({
  videoRef,
  src,
  label,
  rating,
  issues,
  onRatingChange,
  onIssuesChange
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleIssue = (issue) => {
    const newIssues = issues.includes(issue)
      ? issues.filter(i => i !== issue)
      : [...issues, issue];
    onIssuesChange(newIssues);
  };

  return (
    <div className="video-rating-panel">
      {/* Video */}
      <div className="video-wrapper">
        <div className="video-label">{label}</div>
        <video
          ref={videoRef}
          preload="auto"
          playsInline
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>

      {/* Rating Card */}
      <div className="rating-card">
        <div className="rating-row">
          <div className="rating-stars">
            {STAR_RATING_RANGE.map((value) => (
              <span
                key={value}
                className={`star ${value <= rating ? 'selected' : ''}`}
                onClick={() => onRatingChange(value)}
                title={`${value} star${value > SINGULAR_THRESHOLD ? 's' : ''}`}
              >
                {value <= rating ? '★' : '☆'}
              </span>
            ))}
          </div>

          <div className="issues-dropdown">
            <button
              className="issues-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), DROPDOWN_CLOSE_DELAY_MS)}
            >
              {issues.length > 0
                ? `${issues.length} issue${issues.length > SINGULAR_THRESHOLD ? 's' : ''}`
                : 'Issues'}
            </button>
            {isDropdownOpen && (
              <div className="issues-menu">
                {LIPSYNC_REASONS.map((reason, index) => (
                  <label key={index} className="issue-item">
                    <input
                      type="checkbox"
                      checked={issues.includes(reason)}
                      onChange={() => toggleIssue(reason)}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
