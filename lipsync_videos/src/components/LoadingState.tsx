import './LoadingState.css';

interface LoadingStateProps {
  message: string;
  isError?: boolean;
}

export function LoadingState({ message, isError = false }: LoadingStateProps) {
  return (
    <div className="container">
      <div className={isError ? 'loading-state error' : 'loading-state'}>
        {message}
      </div>
    </div>
  );
}
