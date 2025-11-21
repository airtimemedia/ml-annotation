import { useComparison } from '../../context/ComparisonContext';
import './VideoNavigation.css';

export default function VideoNavigation() {
  const { comparisons, currentIndex, goToIndex } = useComparison();

  if (!comparisons || comparisons.length === 0) return null;

  const currentComparison = comparisons[currentIndex];

  const handleComparisonChange = (e) => {
    const newIndex = parseInt(e.target.value);
    if (newIndex >= 0 && newIndex < comparisons.length) {
      goToIndex(newIndex);
    }
  };

  return (
    <div className="video-navigation">
      <div className="nav-section">
        <label htmlFor="comparison-select">Comparison:</label>
        <select
          id="comparison-select"
          value={currentIndex}
          onChange={handleComparisonChange}
          className="nav-select"
        >
          {comparisons.map((comp, idx) => {
            const [model1, model2] = comp.modelPair;
            return (
              <option key={idx} value={idx}>
                {idx + 1}. {comp.videoName} ({model1} vs {model2})
              </option>
            );
          })}
        </select>
      </div>

      <div className="nav-info">
        {currentIndex + 1} of {comparisons.length}
      </div>
    </div>
  );
}
