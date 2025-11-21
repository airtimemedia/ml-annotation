import { useState } from 'react';
import Card from './ui/Card';
import './ConfigUpload.css';
import {
  SAMPLE_CONFIGS
} from '../constants/index';

const SAMPLE_CONFIGS_METADATA = {
  'lipsync-comparison': {
    name: '10-26-2025 Lipsync Comparison',
    path: SAMPLE_CONFIGS.LIPSYNC_COMPARISON
  },
};

export default function ConfigUpload({ onConfigLoad }) {
  const [error, setError] = useState(null);
  const [selectedSample, setSelectedSample] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [isFormatExpanded, setIsFormatExpanded] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const config = JSON.parse(event.target.result);

        // Validate config structure
        if (!Array.isArray(config)) {
          throw new Error('Config must be an array of video objects');
        }

        // Validate each video object
        config.forEach((video, index) => {
          if (!video.video_name) {
            throw new Error(`Video ${index + 1} must have a "video_name" field`);
          }
          if (!video.models || typeof video.models !== 'object') {
            throw new Error(`Video ${index + 1} must have a "models" object`);
          }
          const modelCount = Object.keys(video.models).length;
          if (modelCount < 2) {
            throw new Error(`Video "${video.video_name}" must have at least 2 models (found ${modelCount})`);
          }
        });

        setError(null);
        setIsProcessing(true);
        setProcessingStatus('Loading videos...');

        await onConfigLoad(config);

        setIsProcessing(false);
        setProcessingStatus('');
      } catch (err) {
        setError(err.message);
        setIsProcessing(false);
        setProcessingStatus('');
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsText(file);
  };

  const handleSampleSelect = async (e) => {
    const configKey = e.target.value;
    setSelectedSample(configKey);

    if (configKey && SAMPLE_CONFIGS_METADATA[configKey]) {
      try {
        const response = await fetch(SAMPLE_CONFIGS_METADATA[configKey].path);
        if (!response.ok) {
          throw new Error('Failed to load sample config');
        }
        const config = await response.json();

        // Validate config structure (same as file upload)
        if (!Array.isArray(config)) {
          throw new Error('Config must be an array of video objects');
        }

        setError(null);
        setIsProcessing(true);
        setProcessingStatus('Loading videos...');

        await onConfigLoad(config);

        setIsProcessing(false);
        setProcessingStatus('');
      } catch (err) {
        setError(err.message);
        setIsProcessing(false);
        setProcessingStatus('');
      }
    }
  };

  return (
    <div className="config-upload-container">
      <Card className="config-upload-card">
        <label htmlFor="sample-select" className="sample-select-label">
            Upload Video Pairs
        </label>

        <div className="upload-section">
          <label htmlFor="config-file" className="upload-label">
            <div className="upload-text">
              <span className="upload-text-main">Click to upload</span>
              <span className="upload-text-sub">or drag and drop</span>
            </div>
            <input
              id="config-file"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="file-input"
              disabled={isProcessing}
            />
          </label>

        </div>

        <div className="config-info">
          <button
            onClick={() => setIsFormatExpanded(!isFormatExpanded)}
            className="debug-select"
            style={{ height: '32px', border: 'none'}}
          >
            {''}
            {/* <span>Expected JSON Format</span> */}
          </button>
          {isFormatExpanded && (
            <pre className="code-block" style={{ marginTop: '12px' }}>
{`[
  {
    "video_name": "video_0001",
    "models": {
      "ground-truth": "https://<bucket>.s3.<region>.amazonaws.com/ground-truth/video_0001.mp4",
      "lipsync--flashsync": "https://<bucket>.s3.<region>.amazonaws.com/flashsync/video_0001.mp4",
      "model-xyz": "https://<bucket>.s3.<region>.amazonaws.com/model-xyz/video_0001.mp4"
    }
  },
  {
    "video_name": "video_0002",
    "models": {
      "ground-truth": "https://.../ground-truth/video_0002.mp4",
      "lipsync--flashsync": "https://.../flashsync/video_0002.mp4"
    }
  }
]`}
            </pre>
          )}
        </div>

        <div className="divider">
          <span>or</span>
        </div>

        <div className="sample-select-section">
          <label htmlFor="sample-select" className="sample-select-label">
            Load Preset
          </label>
          <select
            id="sample-select"
            value={selectedSample}
            onChange={handleSampleSelect}
            className="debug-select"
            disabled={isProcessing}
          >
            <option value="">Select a sample set...</option>
            {Object.entries(SAMPLE_CONFIGS_METADATA).map(([key, { name }]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* <Button variant="secondary" onClick={downloadSampleConfig} className="sample-button">
          Download Sample Config
        </Button> */}

        {isProcessing && (
          <div className="processing-overlay">
            <div className="processing-content">
              <div className="spinner"></div>
              <p className="processing-message">{processingStatus}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
      </Card>
    </div>
  );
}
