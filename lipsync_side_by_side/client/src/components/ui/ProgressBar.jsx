import './ProgressBar.css';

export default function ProgressBar({ total, current, completed = [] }) {
  const MAX_VISIBLE = 5;

  // If total is small enough, show all
  if (total <= MAX_VISIBLE + 2) {
    return (
      <div className="progress-bar">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={`progress-step ${
              completed.includes(index) ? 'completed' :
              index === current ? 'active' : ''
            }`}
          />
        ))}
      </div>
    );
  }

  // Calculate sliding window
  const halfWindow = Math.floor(MAX_VISIBLE / 2);
  let startIndex = Math.max(0, current - halfWindow);
  let endIndex = Math.min(total - 1, startIndex + MAX_VISIBLE - 1);

  // Adjust start if we're near the end
  if (endIndex - startIndex < MAX_VISIBLE - 1) {
    startIndex = Math.max(0, endIndex - MAX_VISIBLE + 1);
  }

  const showStartEllipsis = startIndex > 0;
  const showEndEllipsis = endIndex < total - 1;

  return (
    <div className="progress-bar">
      {showStartEllipsis && (
        <div className="progress-ellipsis" />
      )}
      {Array.from({ length: endIndex - startIndex + 1 }).map((_, i) => {
        const index = startIndex + i;
        return (
          <div
            key={index}
            className={`progress-step ${
              completed.includes(index) ? 'completed' :
              index === current ? 'active' : ''
            }`}
          />
        );
      })}
      {showEndEllipsis && (
        <div className="progress-ellipsis" />
      )}
    </div>
  );
}
