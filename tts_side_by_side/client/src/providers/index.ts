/**
 * Provider Registry - Central configuration for all TTS providers
 */

import { ELEVENLABS_CONFIG } from './elevenlabs';
import { YTTS_CONFIG } from './ytts';
import {
  ProviderId,
  Provider,
  ProviderConfig,
  Model,
  Parameter,
  Settings,
  APIEndpoints,
} from '../types';

// Provider registry
export const PROVIDERS: Record<string, ProviderId> = {
  ELEVENLABS: 'elevenlabs',
  YTTS: 'ytts',
};

// Provider configurations
const PROVIDER_CONFIGS: Record<ProviderId, ProviderConfig> = {
  elevenlabs: ELEVENLABS_CONFIG,
  ytts: YTTS_CONFIG,
};

/**
 * Get all available providers
 */
export function getProviders(): Provider[] {
  return Object.values(PROVIDER_CONFIGS).map(config => ({
    id: config.id,
    name: config.name,
  }));
}

/**
 * Get provider configuration
 * @throws Error if provider not found
 */
export function getProviderConfig(providerId: ProviderId): ProviderConfig {
  const config = PROVIDER_CONFIGS[providerId];
  if (!config) {
    throw new Error(`Provider config not found: ${providerId}`);
  }
  return config;
}

/**
 * Get provider name
 * @throws Error if provider not found
 */
export function getProviderName(providerId: ProviderId): string {
  const config = getProviderConfig(providerId);
  return config.name;
}

/**
 * Get models for a provider
 * @throws Error if provider not found
 */
export function getModelsForProvider(providerId: ProviderId): Model[] {
  const config = getProviderConfig(providerId);
  return config.models;
}

/**
 * Get parameters for a provider
 * @throws Error if provider not found
 */
export function getParametersForProvider(providerId: ProviderId): Parameter[] {
  const config = getProviderConfig(providerId);
  return config.parameters;
}

/**
 * Get default settings for a provider
 * @throws Error if provider not found
 */
export function getDefaultSettings(providerId: ProviderId): Settings {
  const config = getProviderConfig(providerId);
  return config.getDefaultSettings();
}

/**
 * Get API endpoints for a provider
 * @throws Error if provider not found
 */
export function getProviderAPI(providerId: ProviderId): APIEndpoints {
  const config = getProviderConfig(providerId);
  return config.api;
}

/**
 * Get model display name
 * @throws Error if model not found
 */
export function getModelName(providerId: ProviderId, modelId: string): string {
  const models = getModelsForProvider(providerId);
  const model = models.find(m => m.id === modelId);
  if (!model) {
    throw new Error(`Model not found: ${modelId} for provider ${providerId}`);
  }
  return model.name;
}

/**
 * Validate provider and model combination
 */
export function isValidProviderModel(providerId: ProviderId, modelId: string): boolean {
  const models = getModelsForProvider(providerId);
  return models.some(m => m.id === modelId);
}

// Export provider configs for direct access if needed
export { ELEVENLABS_CONFIG, YTTS_CONFIG };
