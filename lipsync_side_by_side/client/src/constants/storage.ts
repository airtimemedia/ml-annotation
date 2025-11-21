// Local Storage & Session Management Constants

// LocalStorage Keys
export const STORAGE_KEY: string = 'video-comparison-session';

// Randomization
export const RANDOMIZATION_THRESHOLD: number = 0.5; // 50% chance to swap videos
export const LABEL_RANDOM_MAX: number = 1000; // Max random number for label generation
export const LABEL_CHARS: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Sample Configuration Paths
export const SAMPLE_CONFIGS = {
  LIPSYNC_COMPARISON: '/sample-configs/10-26-2025-lipsync-comparison.json',
} as const;
