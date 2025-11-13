import type { Statistics } from '../types';
import './StatisticsPanel.css';

interface StatisticsPanelProps {
  statistics: Statistics;
  onExport: () => void;
}

export function StatisticsPanel({ statistics, onExport }: StatisticsPanelProps) {
  const fieldLabels: Record<string, string> = {
    source: 'Source',
    content_type: 'Character Type',
    direction: 'Direction',
    size: 'Size',
    include: 'Include',
    category: 'Category',
  };

  return (
    <div className="statistics-panel">
      <div className="statistics-panel__header">
        <h3>Progress Overview</h3>
        <button onClick={onExport} className="btn-export">
          Export CSV
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Total Videos</div>
          <div className="stat-value">{statistics.totalVideos}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{statistics.completeVideos}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Remaining</div>
          <div className="stat-value">{statistics.remainingVideos}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Progress</div>
          <div className="stat-value">{statistics.progressPercent}%</div>
        </div>
      </div>

      <div className="category-stats">
        <div className="category-stats__title">Field Statistics</div>
        <div className="field-breakdown">
          {Object.entries(statistics.fieldCounts).map(([field, counts]) => (
            <div key={field} className="field-section">
              <div className="field-title">{fieldLabels[field] || field}</div>
              {Object.entries(counts)
                .sort(([, a], [, b]) => b - a)
                .map(([value, count]) => (
                  <div key={value} className="category-item">
                    <span className="category-name">{value}</span>
                    <span className="category-count">{count}</span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
