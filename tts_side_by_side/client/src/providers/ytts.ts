/**
 * YTTS Provider Configuration
 */

import { ProviderConfig, YTTSSettings } from '../types';

export const YTTS_CONFIG: ProviderConfig = {
  id: 'ytts',
  name: 'YTTS',

  models: [
    {
      id: 'ytts_v1.0.2',
      name: 'v1.0.2 (Cantina API)',
      description: 'HTTP API-based model using Cantina endpoint',
      type: 'api',
    },
    {
      id: 'ytts_v1.1.0',
      name: 'v1.1.0 (Tahoe API)',
      description: 'HTTP API-based model using Tahoe endpoint',
      type: 'api',
    },
    {
      id: 'haitong',
      name: "Haitong's Candidate",
      description: 'ParaLinguistic GRPO v1 (epoch 0, step 1200)',
      type: 'checkpoint',
    },
    {
      id: 'zbigniew',
      name: "Zbigniew's Candidate",
      description: 'Simple GRPO v2 (epoch 0, step 450)',
      type: 'checkpoint',
    },
    {
      id: 'julian',
      name: "Julian's Candidate",
      description: 'DPO beta 0.1 (mTurk gradio bf16)',
      type: 'checkpoint',
    },
  ],

  defaultModel: 'ytts_v1.0.2',

  // Parameter definitions for UI rendering
  parameters: [
    {
      key: 'temperature',
      label: 'Temperature',
      type: 'slider',
      min: 0.1,
      max: 2.0,
      step: 0.05,
      default: 0.9,
      format: (val: number) => val.toFixed(2),
    },
    {
      key: 'top_p',
      label: 'Top P',
      type: 'slider',
      min: 0.1,
      max: 1.0,
      step: 0.05,
      default: 0.85,
      format: (val: number) => val.toFixed(2),
    },
    {
      key: 'top_k',
      label: 'Top K',
      type: 'slider',
      min: 50,
      max: 500,
      step: 10,
      default: 230,
      format: (val: number) => val.toString(),
    },
    {
      key: 'audio_temperature',
      label: 'Audio Temperature',
      type: 'slider',
      min: 0.1,
      max: 1.5,
      step: 0.05,
      default: 0.55,
      format: (val: number) => val.toFixed(2),
    },
  ],

  // Get default settings for this provider
  getDefaultSettings(): YTTSSettings {
    const settings: YTTSSettings = {
      model: this.defaultModel,
      temperature: 0.9,
      top_p: 0.85,
      top_k: 230,
      audio_temperature: 0.55,
    };

    this.parameters.forEach(param => {
      settings[param.key] = param.default;
    });

    return settings;
  },

  // API endpoints
  api: {
    clone: '/api/tts/clone-voice',
    generate: '/api/tts/generate',
  },
};
