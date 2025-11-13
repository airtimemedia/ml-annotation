export interface DatasetRow {
  prompt_name: string;
  new_room_unified_format_input: string;
  unified_format_output_enriched_fixed: string;
  'gpt5-results-20250905': string;
  'gpt5-results-20251104': string;
}

export interface Annotation {
  prompt_name: string;
  new_room_unified_format_input: string;
  unified_format_output_enriched_fixed: string;
  reviewed: boolean;
  timestamp: number;
  last_updated: string;
}

export interface ParsedOutput {
  action?: string;
  requester?: string;
  requested_users?: string[];
  action_metadata?: Record<string, any>;
}

export interface DatasetMetrics {
  totalRows: number;
  reviewedCount: number;
  promptCounts: Record<string, number>;
  actionCounts: Record<string, number>;
}

export type FilterType = 'prompt' | 'action';

export interface FilterState {
  prompts: Set<string>;
  actions: Set<string>;
}

export function hasActiveFilters(filter: FilterState): boolean {
  return filter.prompts.size > 0 || filter.actions.size > 0;
}

export interface FilteredRowsResult {
  filteredRows: DatasetRow[];
  mapFilteredToOriginal: (filteredIndex: number) => number;
  mapOriginalToFiltered: (originalIndex: number) => number | null;
}

export interface DatasetResponse {
  success: boolean;
  rows: DatasetRow[];
  count: number;
  source: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}
