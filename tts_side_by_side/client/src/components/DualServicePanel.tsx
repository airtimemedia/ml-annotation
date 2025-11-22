import { useState, useEffect } from 'react';
import { getModelsForProvider, getDefaultSettings, getParametersForProvider } from '../utils/modelHelpers';
import { getProviders } from '../providers';
import { ProviderId, Provider, ModelOption, Settings, Parameter, GenerationState } from '../types';

interface SingleServicePanelProps {
  provider: ProviderId;
  model: string;
  onProviderChange: (provider: ProviderId) => void;
  onModelChange: (model: string) => void;
  onClone: () => void;
  isCloning: boolean;
  isCloned: boolean;
  needsReclone: boolean;
  cloneError: string | null;
  onSettingsChange: (settings: Settings) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  disabled: boolean;
}

function SingleServicePanel({
  provider,
  model,
  onProviderChange,
  onModelChange,
  onClone,
  isCloning,
  isCloned,
  needsReclone,
  cloneError,
  onSettingsChange,
  onGenerate,
  isGenerating,
  canGenerate,
  disabled
}: SingleServicePanelProps) {
  const providers: Provider[] = getProviders();
  const [availableModels, setAvailableModels] = useState<ModelOption[]>(getModelsForProvider(provider));
  const [settings, setSettings] = useState<Settings>(getDefaultSettings(provider));
  const [parameters, setParameters] = useState<Parameter[]>(getParametersForProvider(provider));

  useEffect(() => {
    setAvailableModels(getModelsForProvider(provider));
    setParameters(getParametersForProvider(provider));
    const newDefaultSettings = getDefaultSettings(provider);
    setSettings(newDefaultSettings);
    if (onSettingsChange) {
      onSettingsChange(newDefaultSettings);
    }
  }, [provider]);

  // Update settings.model when model prop changes
  useEffect(() => {
    const newSettings = { ...settings, model };
    console.log('[SERVICE PANEL] Model changed, updating settings:', {
      provider,
      model,
      newSettings,
    });
    setSettings(newSettings);
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  }, [model]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as ProviderId;
    onProviderChange(newProvider);

    const models = getModelsForProvider(newProvider);
    if (models.length > 0) {
      onModelChange(models[0].value);
    }
  };

  const handleSettingChange = (key: string, value: number | boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  const handleRevert = () => {
    const newDefaultSettings = getDefaultSettings(provider);
    setSettings(newDefaultSettings);
    if (onSettingsChange) {
      onSettingsChange(newDefaultSettings);
    }
  };

  const isModified = (): boolean => {
    const currentDefaults = getDefaultSettings(provider);
    const { model: _, ...currentParams } = settings;
    const { model: __, ...defaultParams } = currentDefaults;
    return JSON.stringify(currentParams) !== JSON.stringify(defaultParams);
  };

  const renderParameter = (param: Parameter) => {
    const value = settings[param.key] ?? param.default;

    if (param.type === 'slider') {
      return (
        <div className="setting-item" key={param.key}>
          <label className="setting-label">
            <div className="label-header">
              <span className="label-text">{param.label}</span>
              <span className="label-value">{param.format ? param.format(value as number) : value}</span>
            </div>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={value as number}
              onChange={(e) => {
                const newValue = param.step && param.step % 1 === 0
                  ? parseInt(e.target.value)
                  : parseFloat(e.target.value);
                handleSettingChange(param.key, newValue);
              }}
              className="setting-slider"
            />
          </label>
        </div>
      );
    } else if (param.type === 'checkbox') {
      return (
        <div className="setting-item" key={param.key}>
          <label className="setting-checkbox-label">
            <input
              type="checkbox"
              checked={(value as boolean) || false}
              onChange={(e) => handleSettingChange(param.key, e.target.checked)}
              className="setting-checkbox"
            />
            <span className="label-text">{param.label}</span>
          </label>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="single-service-panel">
      <div className="service-section">
        <h4 className="section-title">Provider &amp; Model</h4>
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

        <button
          onClick={onClone}
          disabled={disabled || isCloning || (isCloned && !needsReclone)}
          className={`btn ${isCloned && !needsReclone ? 'btn-secondary' : 'btn-primary'}`}
          style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
        >
          {isCloning ? (
            <>
              <span className="spinner"></span>
              Cloning Voice...
            </>
          ) : isCloned && !needsReclone ? (
            <>✓ Voice Cloned</>
          ) : isCloned && needsReclone ? (
            'Reclone Voice'
          ) : (
            'Clone Voice'
          )}
        </button>

        {cloneError && (
          <div className="status-message status-error" style={{ marginTop: 'var(--spacing-sm)' }}>
            <span>{cloneError}</span>
          </div>
        )}
      </div>

      <div className="service-section inference-settings-section">
        <div className="inference-settings-header">
          <h4 className="section-title">Inference Settings</h4>
          {isModified() && (
            <div className="inference-settings-controls">
              <span className="modified-indicator">Modified</span>
              <button
                onClick={handleRevert}
                className="btn-revert"
                title="Revert to defaults"
              >
                Revert
              </button>
            </div>
          )}
        </div>
        <div className="inference-settings-content">
          {parameters.map(param => renderParameter(param))}
        </div>
      </div>

      <div className="service-section">
        <button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          {isGenerating ? (
            <>
              <span className="spinner"></span>
              Generating...
            </>
          ) : (
            'Generate'
          )}
        </button>
        {!canGenerate && (
          <span className="button-hint">Clone voice first</span>
        )}
      </div>
    </div>
  );
}

interface DualServicePanelProps {
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
  needsReclone1: boolean;
  needsReclone2: boolean;
  cloneError1: string | null;
  cloneError2: string | null;
  onSettings1Change: (settings: Settings) => void;
  onSettings2Change: (settings: Settings) => void;
  onGenerate: (service: 'service1' | 'service2') => void;
  isGenerating: GenerationState;
  canGenerate1: boolean;
  canGenerate2: boolean;
  disabled: boolean;
}

export default function DualServicePanel({
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
  needsReclone1,
  needsReclone2,
  cloneError1,
  cloneError2,
  onSettings1Change,
  onSettings2Change,
  onGenerate,
  isGenerating,
  canGenerate1,
  canGenerate2,
  disabled
}: DualServicePanelProps) {
  return (
    <div className="dual-service-panel">
      <SingleServicePanel
        provider={provider1}
        model={model1}
        onProviderChange={onProvider1Change}
        onModelChange={onModel1Change}
        onClone={onClone1}
        isCloning={isCloning1}
        isCloned={isCloned1}
        needsReclone={needsReclone1}
        cloneError={cloneError1}
        onSettingsChange={onSettings1Change}
        onGenerate={() => onGenerate('service1')}
        isGenerating={isGenerating.service1 || isGenerating.both}
        canGenerate={canGenerate1}
        disabled={disabled}
      />
      <SingleServicePanel
        provider={provider2}
        model={model2}
        onProviderChange={onProvider2Change}
        onModelChange={onModel2Change}
        onClone={onClone2}
        isCloning={isCloning2}
        isCloned={isCloned2}
        needsReclone={needsReclone2}
        cloneError={cloneError2}
        onSettingsChange={onSettings2Change}
        onGenerate={() => onGenerate('service2')}
        isGenerating={isGenerating.service2 || isGenerating.both}
        canGenerate={canGenerate2}
        disabled={disabled}
      />
    </div>
  );
}
