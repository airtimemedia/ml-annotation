/**
 * ElevenLabs Provider Configuration
 */

import { ProviderConfig, ElevenLabsSettings } from '../types';

export const ELEVENLABS_CONFIG: ProviderConfig = {
  id: 'elevenlabs',
  name: 'ElevenLabs',

  models: [
    {
      id: 'eleven_flash_v2_5',
      name: 'Flash v2.5',
      description: 'Fastest model with good quality'
    },
    {
      id: 'eleven_turbo_v2',
      name: 'Turbo v2',
      description: 'Recommended for most use cases'
    },
    {
      id: 'eleven_turbo_v2_5',
      name: 'Turbo v2.5',
      description: 'Latest turbo model'
    },
    {
      id: 'eleven_multilingual_v2',
      name: 'Multilingual v2',
      description: 'Supports multiple languages'
    },
  ],

  defaultModel: 'eleven_turbo_v2',

  // Parameter definitions for UI rendering
  parameters: [
    {
      key: 'stability',
      label: 'Stability',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
      format: (val: number) => val.toFixed(2),
    },
    {
      key: 'similarity_boost',
      label: 'Similarity',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.75,
      format: (val: number) => val.toFixed(2),
    },
    {
      key: 'style',
      label: 'Style',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.0,
      format: (val: number) => val.toFixed(2),
    },
    {
      key: 'speed',
      label: 'Speed',
      type: 'slider',
      min: 0.5,
      max: 2.0,
      step: 0.1,
      default: 1.0,
      format: (val: number) => `${val.toFixed(1)}×`,
    },
    {
      key: 'use_speaker_boost',
      label: 'Speaker Boost',
      type: 'checkbox',
      default: true,
    },
  ],

  // Get default settings for this provider
  getDefaultSettings(): ElevenLabsSettings {
    const settings: ElevenLabsSettings = {
      model: this.defaultModel,
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      speed: 1.0,
      use_speaker_boost: true,
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
