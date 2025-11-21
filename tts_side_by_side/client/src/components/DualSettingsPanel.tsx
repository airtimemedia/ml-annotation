import { useState, useEffect } from 'react';
import { getDefaultSettings, getParametersForProvider } from '../utils/modelHelpers';
import { ProviderId, Settings, Parameter } from '../types';

interface SingleSettingsProps {
  title: string;
  provider: ProviderId;
  model: string;
  onChange: (settings: Settings) => void;
}

function SingleSettings({ title, provider, model, onChange }: SingleSettingsProps) {
  const [settings, setSettings] = useState<Settings>(getDefaultSettings(provider));
  const [parameters] = useState<Parameter[]>(getParametersForProvider(provider));

  // Update settings when provider changes (from parent)
  useEffect(() => {
    const newDefaultSettings = getDefaultSettings(provider);
    setSettings(prev => ({ ...newDefaultSettings, ...prev, model }));
  }, [provider, model]);

  const handleChange = (key: string, value: number | boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (onChange) {
      onChange(newSettings);
    }
  };

  const handleRevert = () => {
    const newDefaultSettings = getDefaultSettings(provider);
    setSettings(newDefaultSettings);
    if (onChange) {
      onChange(newDefaultSettings);
    }
  };

  // Check if settings have been modified
  const isModified = (): boolean => {
    const currentDefaults = getDefaultSettings(provider);
    // Only compare parameter values, not model
    const { model: _, ...currentParams } = settings;
    const { model: __, ...defaultParams } = currentDefaults;
    return JSON.stringify(currentParams) !== JSON.stringify(defaultParams);
  };

  // Render a parameter based on its type
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
                handleChange(param.key, newValue);
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
              onChange={(e) => handleChange(param.key, e.target.checked)}
              className="setting-checkbox"
            />
            <span className="label-text">{param.label}</span>
          </label>
        </div>
      );
    } else if (param.type === 'select') {
      return (
        <div className="setting-item" key={param.key}>
          <label className="setting-label">
            <span className="label-text">{param.label}</span>
            <select
              value={value as string}
              onChange={(e) => handleChange(param.key, e.target.value)}
              className="setting-select"
            >
              {param.options?.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="single-settings">
      <div className="settings-list">
        <div className="setting-item">
          <div className="label-header" style={{ marginBottom: 'var(--spacing-sm)' }}>
            <span className="label-text" style={{ fontWeight: 600 }}>{title}</span>
            {isModified() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        </div>

        {/* Dynamically render parameters from provider config */}
        {parameters.map(param => renderParameter(param))}
      </div>
    </div>
  );
}

interface DualSettingsPanelProps {
  provider1: ProviderId;
  provider2: ProviderId;
  model1: string;
  model2: string;
  onSettings1Change: (settings: Settings) => void;
  onSettings2Change: (settings: Settings) => void;
}

export default function DualSettingsPanel({
  provider1,
  provider2,
  model1,
  model2,
  onSettings1Change,
  onSettings2Change,
}: DualSettingsPanelProps) {
  return (
    <div className="dual-settings-panel">
      <SingleSettings
        title="Service 1"
        provider={provider1}
        model={model1}
        onChange={onSettings1Change}
      />
      <SingleSettings
        title="Service 2"
        provider={provider2}
        model={model2}
        onChange={onSettings2Change}
      />
    </div>
  );
}
