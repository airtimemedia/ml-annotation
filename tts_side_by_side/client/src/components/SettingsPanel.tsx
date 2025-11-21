import { useState } from 'react';
import { Settings } from '../types';

interface SettingsPanelProps {
  onChange: (settings: Settings) => void;
}

export default function SettingsPanel({ onChange }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>({
    model: 'eleven_turbo_v2',
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true,
    speed: 1.0,
  });

  const handleChange = (key: string, value: number | boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (onChange) {
      onChange(newSettings);
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>Fine-tune Parameters</h3>
        <p className="settings-description">Adjust voice characteristics and generation quality</p>
      </div>

      <div className="settings-grid">
        <div className="setting-group">
          <label className="setting-label">
            <span className="label-text">Model</span>
            <select
              value={settings.model as string}
              onChange={(e) => handleChange('model', e.target.value)}
              className="setting-select"
            >
              <option value="eleven_flash_v2_5">Flash v2.5 (Fastest)</option>
              <option value="eleven_turbo_v2">Turbo v2 (Recommended)</option>
              <option value="eleven_turbo_v2_5">Turbo v2.5</option>
              <option value="eleven_multilingual_v2">Multilingual v2</option>
            </select>
          </label>
        </div>

        <div className="setting-group">
          <label className="setting-label">
            <div className="label-header">
              <span className="label-text">Stability</span>
              <span className="label-value">{(settings.stability as number).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.stability as number}
              onChange={(e) => handleChange('stability', parseFloat(e.target.value))}
              className="setting-slider"
            />
            <span className="setting-hint">
              Lower: more expressive | Higher: more consistent
            </span>
          </label>
        </div>

        <div className="setting-group">
          <label className="setting-label">
            <div className="label-header">
              <span className="label-text">Similarity Boost</span>
              <span className="label-value">{(settings.similarity_boost as number).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.similarity_boost as number}
              onChange={(e) => handleChange('similarity_boost', parseFloat(e.target.value))}
              className="setting-slider"
            />
            <span className="setting-hint">
              How closely to match the reference voice
            </span>
          </label>
        </div>

        <div className="setting-group">
          <label className="setting-label">
            <div className="label-header">
              <span className="label-text">Style</span>
              <span className="label-value">{(settings.style as number).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.style as number}
              onChange={(e) => handleChange('style', parseFloat(e.target.value))}
              className="setting-slider"
            />
            <span className="setting-hint">
              Style exaggeration (0 = minimal processing)
            </span>
          </label>
        </div>

        <div className="setting-group">
          <label className="setting-label">
            <div className="label-header">
              <span className="label-text">Speed</span>
              <span className="label-value">{(settings.speed as number).toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.speed as number}
              onChange={(e) => handleChange('speed', parseFloat(e.target.value))}
              className="setting-slider"
            />
            <span className="setting-hint">
              Playback speed (1.0 = normal)
            </span>
          </label>
        </div>

        <div className="setting-group">
          <label className="setting-checkbox-label">
            <input
              type="checkbox"
              checked={settings.use_speaker_boost as boolean}
              onChange={(e) => handleChange('use_speaker_boost', e.target.checked)}
              className="setting-checkbox"
            />
            <div className="checkbox-content">
              <span className="label-text">Speaker Boost</span>
              <span className="setting-hint">
                Enhance similarity to reference (higher latency)
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
