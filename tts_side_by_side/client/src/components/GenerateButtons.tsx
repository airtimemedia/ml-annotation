import { getProviderName } from '../utils/modelHelpers';
import { ProviderId, GenerationState, StatusMessage, ServiceType } from '../types';

interface GenerateButtonsProps {
  provider1: ProviderId;
  provider2: ProviderId;
  isGenerating: GenerationState;
  onGenerate: (service: ServiceType) => void;
  canGenerate1: boolean;
  canGenerate2: boolean;
  status: StatusMessage | null;
}

/**
 * Generate buttons component with individual and combined generation
 */
export default function GenerateButtons({
  provider1,
  provider2,
  isGenerating,
  onGenerate,
  canGenerate1,
  canGenerate2,
  status,
}: GenerateButtonsProps) {
  const canGenerateBoth = canGenerate1 && canGenerate2;

  return (
    <>
      {/* Generate Buttons - Under Settings */}
      <div className="generate-buttons-row">
        <div className="generate-button-cell">
          <button
            onClick={() => onGenerate('service1')}
            disabled={!canGenerate1 || isGenerating.service1 || isGenerating.both}
            className="btn btn-secondary"
            title={!canGenerate1 ? 'Clone voice first' : ''}
          >
            {isGenerating.service1 ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              `Generate ${getProviderName(provider1)}`
            )}
          </button>
          {!canGenerate1 && (
            <span className="button-hint">Clone voice first</span>
          )}
        </div>

        <div className="generate-button-cell">
          <button
            onClick={() => onGenerate('service2')}
            disabled={!canGenerate2 || isGenerating.service2 || isGenerating.both}
            className="btn btn-secondary"
            title={!canGenerate2 ? 'Clone voice first' : ''}
          >
            {isGenerating.service2 ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              `Generate ${getProviderName(provider2)}`
            )}
          </button>
          {!canGenerate2 && (
            <span className="button-hint">Clone voice first</span>
          )}
        </div>
      </div>

      {/* Generate Both Button - Centered */}
      <div className="generate-both-section">
        <button
          onClick={() => onGenerate('both')}
          disabled={!canGenerateBoth || isGenerating.service1 || isGenerating.service2 || isGenerating.both}
          className="btn btn-primary"
          title={!canGenerateBoth ? 'Clone both voices first' : ''}
        >
          {isGenerating.both ? (
            <>
              <span className="spinner"></span>
              Generating Both...
            </>
          ) : (
            'Generate Both'
          )}
        </button>
        {!canGenerateBoth && (
          <span className="button-hint">Clone both voices first</span>
        )}

        {status && (
          <div className={`status-message status-${status.type}`}>
            {status.type === 'loading' && <span className="spinner"></span>}
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </>
  );
}
