/**
 * Core TypeScript type definitions for the TTS Side-by-Side application
 */

// Provider IDs
export type ProviderId = 'elevenlabs' | 'ytts';

// Model information
export interface Model {
  id: string;
  name: string;
  description: string;
  type?: 'api' | 'checkpoint';
}

// Model option for dropdowns (legacy format)
export interface ModelOption {
  value: string;
  label: string;
}

// Provider information
export interface Provider {
  id: ProviderId;
  name: string;
}

// Parameter types
export type ParameterType = 'slider' | 'checkbox' | 'select';

// Select option
export interface SelectOption {
  value: string;
  label: string;
}

// Parameter definition for UI rendering
export interface Parameter {
  key: string;
  label: string;
  type: ParameterType;
  default: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  options?: SelectOption[];
}

// Settings object (dynamic based on provider)
export interface Settings {
  model: string;
  [key: string]: number | boolean | string;
}

// ElevenLabs specific settings
export interface ElevenLabsSettings extends Settings {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
  use_speaker_boost: boolean;
}

// YTTS specific settings
export interface YTTSSettings extends Settings {
  temperature: number;
  top_p: number;
  top_k: number;
  audio_temperature: number;
}

// API endpoints
export interface APIEndpoints {
  clone: string;
  generate: string;
}

// Provider configuration
export interface ProviderConfig {
  id: ProviderId;
  name: string;
  models: Model[];
  defaultModel: string;
  parameters: Parameter[];
  getDefaultSettings(): Settings;
  api: APIEndpoints;
}

// Voice data structure
export interface VoiceData {
  voice_id?: string;
  voice_name?: string;
  [key: string]: any;
  clonedWithFile?: string;
  clonedWithRefAudioKey?: string;
  clonedWithText?: string;
  clonedWithSettings?: Settings;
}

// Voice cache structure
export interface VoiceCache {
  [refAudioKey: string]: {
    [providerId: string]: {
      [modelId: string]: VoiceData;
    };
  };
}

// Audio data structure
export interface AudioResult {
  status: 'ready' | 'pending' | 'error';
  path: string;
  duration?: number;
}

// Service audio data
export interface ServiceAudioData {
  service1?: AudioResult;
  service2?: AudioResult;
}

// Generation state
export interface GenerationState {
  service1: boolean;
  service2: boolean;
  both: boolean;
}

// Status message
export interface StatusMessage {
  type: 'loading' | 'success' | 'error';
  message: string;
}

// Reference audio data
export interface ReferenceAudioData {
  file: File | { name: string; size: number; isGoldenSet: boolean; goldenSetFilename: string };
  isGoldenSet: boolean;
  goldenSetFilename?: string;
  filename: string;
}

// Golden set file info
export interface GoldenSetFile {
  name: string;
  label: string;
  size: number;
}

// TTS Generation hook params
export interface GenerateAudioParams {
  text: string;
  voices: {
    [providerId: string]: VoiceData;
  } | null;
  settings1: Settings;
  settings2: Settings;
  provider1: ProviderId;
  provider2: ProviderId;
}

// Service type for generation
export type ServiceType = 'service1' | 'service2' | 'both';
