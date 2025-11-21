// API Configuration Constants

// Base URL for API requests
// In development, call backend directly on port 8081
// In production, use relative URLs (same origin, proxied by Vercel)
export const API_BASE_URL: string = import.meta.env.DEV ? 'http://localhost:8081' : '';

// API Endpoints
export const ENDPOINTS = {
  COMPARISON_BATCH: '/api/comparison/process-batch',
  PROCESS_VIDEO: '/api/comparison/process-video',
  CLEAR_CACHE: '/api/video/clear-cache',
} as const;

// Full API URLs (combining base + endpoint)
export const getApiUrl = (endpoint: string): string => `${API_BASE_URL}${endpoint}`;
