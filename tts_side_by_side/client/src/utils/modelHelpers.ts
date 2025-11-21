/**
 * Model and provider helper functions
 *
 * This file now acts as a thin wrapper around the provider configuration system.
 * All provider-specific data is defined in src/providers/
 */

import {
  PROVIDERS,
  getProviderName as getProviderNameFromConfig,
  getModelsForProvider as getModelsFromConfig,
  getDefaultSettings as getDefaultSettingsFromConfig,
  getModelName,
  getParametersForProvider,
  getProviderConfig,
} from '../providers';
import { ProviderId, ModelOption, Parameter, Settings, ProviderConfig } from '../types';

// Re-export PROVIDERS constant for backward compatibility
export { PROVIDERS };

/**
 * Get provider display name
 */
export const getProviderName = (provider: ProviderId): string => {
  return getProviderNameFromConfig(provider);
};

/**
 * Get model display name
 */
export const getModelDisplay = (model: string, provider: ProviderId | null = null): string => {
  // If provider is specified, use the more efficient lookup
  if (provider) {
    return getModelName(provider, model);
  }

  // Otherwise, search through all providers (backward compatibility)
  for (const providerId of Object.values(PROVIDERS)) {
    const models = getModelsFromConfig(providerId);
    const found = models.find(m => m.id === model);
    if (found) {
      return found.name;
    }
  }

  return model;
};

/**
 * Get models for a provider
 */
export const getModelsForProvider = (provider: ProviderId): ModelOption[] => {
  const models = getModelsFromConfig(provider);
  // Transform to legacy format (value/label instead of id/name)
  return models.map(m => ({
    value: m.id,
    label: m.name,
  }));
};

/**
 * Get default settings for a provider
 */
export const getDefaultSettings = (provider: ProviderId = PROVIDERS.ELEVENLABS as ProviderId): Settings => {
  return getDefaultSettingsFromConfig(provider);
};

// Export additional provider utilities
export { getParametersForProvider, getProviderConfig, getModelName };

// Re-export types
export type { Parameter, Settings, ProviderConfig };
