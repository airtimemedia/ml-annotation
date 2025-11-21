import { useNavigate } from 'react-router-dom';
import { useComparison } from '../context/ComparisonContext';
import Button from './ui/Button';
import Card from './ui/Card';
import './ResultsView.css';
import {
  INITIAL_RATING,
  INITIAL_PREFERENCES,
  MIN_RATINGS_FOR_AVERAGE,
  TOP_ISSUES_COUNT,
  RATING_DECIMAL_PLACES,
  PERCENTAGE_MULTIPLIER,
  PERCENTAGE_DECIMAL_PLACES
} from '../constants/index';

export default function ResultsView() {
  const { results, reset, resumeEditing, batchId, currentIndex } = useComparison();
  const navigate = useNavigate();

  const handleResumeEditing = () => {
    resumeEditing();
    navigate(`/batch/${batchId}/video/${currentIndex}`, { replace: true });
  };

  // Calculate statistics for each underlying model
  const model1Stats = { ratings: [], issues: [], preferences: INITIAL_PREFERENCES };
  const model2Stats = { ratings: [], issues: [], preferences: INITIAL_PREFERENCES };

  results.forEach((result) => {
    const { video1, video2, preferred, modelMapping } = result;

    // Determine which video contains which model
    const video1Model = modelMapping[Object.keys(modelMapping)[0]];
    const video2Model = modelMapping[Object.keys(modelMapping)[1]];

    // Add ratings to the correct model
    if (video1Model === 'model_1') {
      model1Stats.ratings.push(video1.rating);
      model1Stats.issues.push(...(video1.issues || []));
    } else {
      model2Stats.ratings.push(video1.rating);
      model2Stats.issues.push(...(video1.issues || []));
    }

    if (video2Model === 'model_1') {
      model1Stats.ratings.push(video2.rating);
      model1Stats.issues.push(...(video2.issues || []));
    } else {
      model2Stats.ratings.push(video2.rating);
      model2Stats.issues.push(...(video2.issues || []));
    }

    // Count preferences
    if (preferred) {
      const preferredModel = modelMapping[preferred];
      if (preferredModel === 'model_1') {
        model1Stats.preferences++;
      } else if (preferredModel === 'model_2') {
        model2Stats.preferences++;
      }
    }
  });

  const avgModel1Rating = model1Stats.ratings.length > MIN_RATINGS_FOR_AVERAGE
    ? model1Stats.ratings.reduce((sum, r) => sum + r, INITIAL_RATING) / model1Stats.ratings.length
    : INITIAL_RATING;
  const avgModel2Rating = model2Stats.ratings.length > MIN_RATINGS_FOR_AVERAGE
    ? model2Stats.ratings.reduce((sum, r) => sum + r, INITIAL_RATING) / model2Stats.ratings.length
    : INITIAL_RATING;

  // Overall average across all ratings
  const allRatings = [...model1Stats.ratings, ...model2Stats.ratings];
  const overallAvgRating = allRatings.length > MIN_RATINGS_FOR_AVERAGE
    ? allRatings.reduce((sum, r) => sum + r, INITIAL_RATING) / allRatings.length
    : INITIAL_RATING;

  // Count all issues
  const issueCounts = {};
  [...model1Stats.issues, ...model2Stats.issues].forEach(issue => {
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });

  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ISSUES_COUNT);

  // Determine which model performed better
  const modelComparison = avgModel1Rating > avgModel2Rating
    ? { better: 'model_1', worse: 'model_2', diff: (avgModel1Rating - avgModel2Rating).toFixed(RATING_DECIMAL_PLACES) }
    : { better: 'model_2', worse: 'model_1', diff: (avgModel2Rating - avgModel1Rating).toFixed(RATING_DECIMAL_PLACES) };

  return (
    <div className="results-view">
      <div className="results-header">
        <h1 className="results-title">Results Summary</h1>
        <p className="results-subtitle">Your feedback has been recorded</p>
      </div>

      <Card className="results-summary">
        <h3 className="summary-section-title">Overall Statistics</h3>
        <div className="result-item">
          <div className="result-label">Total Comparisons</div>
          <div className="result-value">{results.length}</div>
        </div>
        <div className="result-item">
          <div className="result-label">Overall Average Rating</div>
          <div className="result-value">
            {overallAvgRating.toFixed(RATING_DECIMAL_PLACES)} <span className="rating-stars">{'★'.repeat(Math.round(overallAvgRating))}</span>
          </div>
        </div>
      </Card>

      <Card className="results-summary">
        <h3 className="summary-section-title">Model Comparison</h3>
        <div className="model-comparison-grid">
          <div className="model-stats">
            <div className="model-label">model_1</div>
            <div className="model-rating">{avgModel1Rating.toFixed(RATING_DECIMAL_PLACES)} ★</div>
            <div className="model-detail">{model1Stats.ratings.length} ratings</div>
          </div>
          <div className="model-stats">
            <div className="model-label">model_2</div>
            <div className="model-rating">{avgModel2Rating.toFixed(RATING_DECIMAL_PLACES)} ★</div>
            <div className="model-detail">{model2Stats.ratings.length} ratings</div>
          </div>
        </div>
        <div className="comparison-winner">
          <strong>{modelComparison.better}</strong> performed better by <strong>{modelComparison.diff}</strong> points
        </div>
      </Card>

      <Card className="results-summary">
        <h3 className="summary-section-title">Preference Distribution</h3>
        <div className="preference-stats">
          <div className="preference-item">
            <div className="preference-label">model_1</div>
            <div className="preference-bar-container">
              <div
                className="preference-bar"
                style={{ width: `${(model1Stats.preferences / results.length) * PERCENTAGE_MULTIPLIER}%` }}
              />
            </div>
            <div className="preference-count">{model1Stats.preferences} ({((model1Stats.preferences / results.length) * PERCENTAGE_MULTIPLIER).toFixed(PERCENTAGE_DECIMAL_PLACES)}%)</div>
          </div>
          <div className="preference-item">
            <div className="preference-label">model_2</div>
            <div className="preference-bar-container">
              <div
                className="preference-bar"
                style={{ width: `${(model2Stats.preferences / results.length) * PERCENTAGE_MULTIPLIER}%` }}
              />
            </div>
            <div className="preference-count">{model2Stats.preferences} ({((model2Stats.preferences / results.length) * PERCENTAGE_MULTIPLIER).toFixed(PERCENTAGE_DECIMAL_PLACES)}%)</div>
          </div>
        </div>
      </Card>

      <Card className="results-summary">
        <h3 className="summary-section-title">Most Common Issues</h3>
        <div className="issues-stats">
          {topIssues.length > 0 ? (
            topIssues.map(([issue, count]) => (
              <div key={issue} className="issue-stat-item">
                <span className="issue-name">{issue}</span>
                <span className="issue-count">{count} occurrences</span>
              </div>
            ))
          ) : (
            <p className="no-issues">No issues reported</p>
          )}
        </div>
      </Card>

      <div className="results-actions">
        <Button variant="secondary" size="large" onClick={handleResumeEditing}>
          ← Back to Annotations
        </Button>
        <Button variant="primary" size="large" onClick={reset}>
          Start New Session
        </Button>
      </div>
    </div>
  );
}
