import { STAR_RATING_RANGE, INITIAL_RATING } from '../../constants/index';
import IssuesDropdown from './IssuesDropdown';

/**
 * FeedbackSection component
 * Handles rating, issues, and preferred selection for a single video
 */
export default function FeedbackSection({
  videoLabel,
  rating,
  setRating,
  issues,
  setIssues,
  isPreferred,
  onPreferredClick,
  suggestedPreferred
}) {
  const preferredClass = isPreferred
    ? 'selected'
    : suggestedPreferred
    ? 'suggested'
    : 'inactive';

  return (
    <div className="video-feedback-section">
      <div className="feedback-header-row">
        <div className="feedback-header">{videoLabel}</div>
        <button
          className={`preferred-badge ${preferredClass}`}
          onClick={onPreferredClick}
        >
          Preferred
        </button>
      </div>
      <div className="rating-row">
        <div className="rating-stars">
          {STAR_RATING_RANGE.map((value) => (
            <span
              key={value}
              className={`star ${value <= rating ? 'selected' : ''}`}
              onClick={() => setRating(value)}
            >
              {value <= rating ? '★' : '☆'}
            </span>
          ))}
        </div>
        <IssuesDropdown
          selectedIssues={issues}
          onChange={setIssues}
        />
      </div>
    </div>
  );
}
