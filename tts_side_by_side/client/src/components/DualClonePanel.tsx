import { useState, useEffect } from 'react';
import { getModelsForProvider, getProviderName, getModelDisplay } from '../utils/modelHelpers';
import { getProviders } from '../providers';
import { ProviderId, Provider, ModelOption } from '../types';

interface SingleClonePanelProps {
  title: string;
  provider: ProviderId;
  model: string;
  onProviderChange: (provider: ProviderId) => void;
  onModelChange: (model: string) => void;
  onClone: () => void;
  isCloning: boolean;
  isCloned: boolean;
  disabled: boolean;
}

function SingleClonePanel({
  title,
  provider,
  model,
  onProviderChange,
  onModelChange,
  onClone,
  isCloning,
  isCloned,
  disabled
}: SingleClonePanelProps) {
  const [availableModels, setAvailableModels] = useState<ModelOption[]>(getModelsForProvider(provider));
  const providers: Provider[] = getProviders();

  useEffect(() => {
    setAvailableModels(getModelsForProvider(provider));
  }, [provider]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as ProviderId;
    onProviderChange(newProvider);

    // Get first model for new provider
    const models = getModelsForProvider(newProvider);
    if (models.length > 0) {
      onModelChange(models[0].value);
    }
  };

  return (
    <div className="single-clone-panel">
      <h4 className="clone-panel-title">{title}</h4>

      <div className="clone-settings">
        <div className="setting-item">
          <label className="setting-label">
            <span className="label-text">Provider</span>
            <select
              value={provider}
              onChange={handleProviderChange}
              className="setting-select"
              disabled={disabled}
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="setting-item">
          <label className="setting-label">
            <span className="label-text">Model</span>
            <select
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              className="setting-select"
              disabled={disabled}
            >
              {availableModels.map((modelOption) => (
                <option key={modelOption.value} value={modelOption.value}>
                  {modelOption.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="clone-button-container">
          <button
            onClick={onClone}
            disabled={disabled || isCloning || isCloned}
            className={`btn ${isCloned ? 'btn-secondary' : 'btn-primary'}`}
          >
            {isCloning ? (
              <>
                <span className="spinner"></span>
                Cloning Voice...
              </>
            ) : isCloned ? (
              <>
                ✓ Voice Cloned
              </>
            ) : (
              'Clone Voice'
            )}
          </button>
          {isCloned && (
            <div className="clone-status">
              <span className="clone-info">
                {getProviderName(provider)} - {getModelDisplay(model, provider)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DualClonePanelProps {
  provider1: ProviderId;
  provider2: ProviderId;
  model1: string;
  model2: string;
  onProvider1Change: (provider: ProviderId) => void;
  onProvider2Change: (provider: ProviderId) => void;
  onModel1Change: (model: string) => void;
  onModel2Change: (model: string) => void;
  onClone1: () => void;
  onClone2: () => void;
  isCloning1: boolean;
  isCloning2: boolean;
  isCloned1: boolean;
  isCloned2: boolean;
  disabled: boolean;
}

export default function DualClonePanel({
  provider1,
  provider2,
  model1,
  model2,
  onProvider1Change,
  onProvider2Change,
  onModel1Change,
  onModel2Change,
  onClone1,
  onClone2,
  isCloning1,
  isCloning2,
  isCloned1,
  isCloned2,
  disabled
}: DualClonePanelProps) {
  return (
    <div className="dual-clone-panel">
      <SingleClonePanel
        title="Service 1"
        provider={provider1}
        model={model1}
        onProviderChange={onProvider1Change}
        onModelChange={onModel1Change}
        onClone={onClone1}
        isCloning={isCloning1}
        isCloned={isCloned1}
        disabled={disabled}
      />
      <SingleClonePanel
        title="Service 2"
        provider={provider2}
        model={model2}
        onProviderChange={onProvider2Change}
        onModelChange={onModel2Change}
        onClone={onClone2}
        isCloning={isCloning2}
        isCloned={isCloned2}
        disabled={disabled}
      />
    </div>
  );
}
