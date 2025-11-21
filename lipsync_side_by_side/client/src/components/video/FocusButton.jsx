/**
 * FocusButton component
 * Button to toggle video focus mode (zoom in on one video)
 */
export default function FocusButton({ videoNum, focusedVideo, onFocus }) {
  const isFocused = focusedVideo === videoNum;

  return (
    <button
      onClick={() => onFocus(videoNum)}
      style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        zIndex: 10,
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        padding: '12px 16px',
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: '500',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.85)'}
      onMouseLeave={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.7)'}
    >
      {isFocused ? '↙' : '🔍'}
    </button>
  );
}
