import { useState } from 'react';
import Card from '../ui/Card';
import { INITIAL_RATING, STAR_RATING_RANGE, MIN_VALID_RATING } from '../../constants/index';
import './FeedbackForm.css';

const LIPSYNC_REASONS = [
  'No issues',
  'Mouth movements don\'t match audio timing',
  'Delayed or early lip movements',
  'Unnatural mouth shapes',
  'Inconsistent synchronization throughout',
  'Audio and video drift over time',
  'Other quality issues'
];

export default function FeedbackForm({ onSubmit, isLastComparison, labels }) {
  const [video1Rating, setVideo1Rating] = useState(INITIAL_RATING);
  const [video2Rating, setVideo2Rating] = useState(INITIAL_RATING);
  const [video1Issues, setVideo1Issues] = useState([]);
  const [video2Issues, setVideo2Issues] = useState([]);
  const [preferred, setPreferred] = useState('');

  const toggleIssue = (videoNum, issue) => {
    if (videoNum === 1) {
      setVideo1Issues(prev =>
        prev.includes(issue)
          ? prev.filter(i => i !== issue)
          : [...prev, issue]
      );
    } else {
      setVideo2Issues(prev =>
        prev.includes(issue)
          ? prev.filter(i => i !== issue)
          : [...prev, issue]
      );
    }
  };

  const handleSubmit = () => {
    onSubmit({
      video1: { rating: video1Rating, issues: video1Issues },
      video2: { rating: video2Rating, issues: video2Issues },
      preferred
    });
    setVideo1Rating(INITIAL_RATING);
    setVideo2Rating(INITIAL_RATING);
    setVideo1Issues([]);
    setVideo2Issues([]);
    setPreferred('');
  };

  const isValid = video1Rating >= MIN_VALID_RATING && video2Rating >= MIN_VALID_RATING && preferred;

  return (
    <Card className="feedback-card">
      <div className="feedback-form-container">
        {/* Video 1 Feedback */}
        <div className="video-feedback">
          <div className="video-feedback-header">{labels[0]}</div>
          <div className="feedback-row">
            <div className="rating-section">
              <label className="rating-label">Rating</label>
              <div className="rating-stars">
                {STAR_RATING_RANGE.map((value) => (
                  <span
                    key={value}
                    className={`star ${value <= video1Rating ? 'selected' : ''}`}
                    onClick={() => setVideo1Rating(value)}
                  >
                    {value <= video1Rating ? '★' : '☆'}
                  </span>
                ))}
              </div>
            </div>

            <div className="issues-section">
              <label className="issues-label">Issues (select all that apply)</label>
              <div className="issues-dropdown">
                <button className="issues-trigger" type="button">
                  {video1Issues.length > 0
                    ? `${video1Issues.length} selected`
                    : 'Select issues...'}
                </button>
                <div className="issues-menu">
                  {LIPSYNC_REASONS.map((reason, index) => (
                    <label key={index} className="issue-item">
                      <input
                        type="checkbox"
                        checked={video1Issues.includes(reason)}
                        onChange={() => toggleIssue(1, reason)}
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video 2 Feedback */}
        <div className="video-feedback">
          <div className="video-feedback-header">{labels[1]}</div>
          <div className="feedback-row">
            <div className="rating-section">
              <label className="rating-label">Rating</label>
              <div className="rating-stars">
                {STAR_RATING_RANGE.map((value) => (
                  <span
                    key={value}
                    className={`star ${value <= video2Rating ? 'selected' : ''}`}
                    onClick={() => setVideo2Rating(value)}
                  >
                    {value <= video2Rating ? '★' : '☆'}
                  </span>
                ))}
              </div>
            </div>

            <div className="issues-section">
              <label className="issues-label">Issues (select all that apply)</label>
              <div className="issues-dropdown">
                <button className="issues-trigger" type="button">
                  {video2Issues.length > 0
                    ? `${video2Issues.length} selected`
                    : 'Select issues...'}
                </button>
                <div className="issues-menu">
                  {LIPSYNC_REASONS.map((reason, index) => (
                    <label key={index} className="issue-item">
                      <input
                        type="checkbox"
                        checked={video2Issues.includes(reason)}
                        onChange={() => toggleIssue(2, reason)}
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preference Section */}
        <div className="preference-section">
          <label className="preference-label">Which video did you prefer overall?</label>
          <div className="preference-buttons">
            <button
              className={`preference-btn ${preferred === labels[0] ? 'selected' : ''}`}
              onClick={() => setPreferred(labels[0])}
            >
              {labels[0]}
            </button>
            <button
              className={`preference-btn ${preferred === labels[1] ? 'selected' : ''}`}
              onClick={() => setPreferred(labels[1])}
            >
              {labels[1]}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="submit-btn"
        >
          {isLastComparison ? 'Submit All Feedback' : 'Next Comparison'}
        </button>
      </div>
    </Card>
  );
}
