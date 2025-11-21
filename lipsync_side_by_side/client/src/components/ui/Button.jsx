import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'medium',
  icon = false,
  disabled = false,
  onClick,
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    icon ? 'btn-icon' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
