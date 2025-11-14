import { useMemo } from 'react';
import { DatasetRow, FilterState, FilteredRowsResult, hasActiveFilters } from '../types';
import type { ParsedRowData } from './useParsedRowCache';

/**
 * Custom hook that filters dataset rows based on multiple filter criteria
 * Filters are combined with AND logic (must match all active filters)
 * and maintains bidirectional index mapping between filtered and original rows
 */
export function useFilteredRows(
  rows: DatasetRow[],
  filter: FilterState,
  parsedCache: Map<DatasetRow, ParsedRowData>
): FilteredRowsResult {
  return useMemo(() => {
    // No filters applied - return all rows with identity mapping
    if (!hasActiveFilters(filter)) {
      return {
        filteredRows: rows,
        filteredIndices: rows.map((_, i) => i),
        mapFilteredToOriginal: (index: number) => index,
        mapOriginalToFiltered: (index: number) => index,
      };
    }

    // Filter rows based on active filters (AND logic - must match all)
    const filtered: Array<{ row: DatasetRow; originalIndex: number }> = [];

    rows.forEach((row, originalIndex) => {
      let matches = true;

      // Check prompt filter (if any prompt filters are active)
      if (filter.prompts.size > 0) {
        // Normalize null/undefined prompt names to empty string
        const promptName = row.prompt_name ?? '';
        if (!filter.prompts.has(promptName)) {
          matches = false;
        }
      }

      // Check action filter (if any action filters are active)
      if (matches && filter.actions.size > 0) {
        const cached = parsedCache.get(row)!;
        const actionType = (!cached.parseError && cached.parsedOutput?.action) ? cached.parsedOutput.action : 'invalid';

        if (!filter.actions.has(actionType)) {
          matches = false;
        }
      }

      // Check review status filter (if any review status filters are active)
      if (matches && filter.reviewStatus.size > 0) {
        const reviewedValue = row.manually_reviewed;
        const isReviewed = reviewedValue === true;

        // Row must match at least one of the selected review statuses
        const matchesReviewStatus =
          (filter.reviewStatus.has('reviewed') && isReviewed) ||
          (filter.reviewStatus.has('not-reviewed') && !isReviewed);

        if (!matchesReviewStatus) {
          matches = false;
        }
      }

      if (matches) {
        filtered.push({ row, originalIndex });
      }
    });

    // Extract filtered rows and indices
    const filteredRows = filtered.map((f) => f.row);
    const filteredIndices = filtered.map((f) => f.originalIndex);

    // Create mapping functions
    const mapFilteredToOriginal = (filteredIndex: number): number => {
      return filteredIndices[filteredIndex] ?? -1;
    };

    // Create reverse mapping for O(1) lookup
    const originalToFilteredMap = new Map<number, number>();
    filteredIndices.forEach((originalIndex, filteredIndex) => {
      originalToFilteredMap.set(originalIndex, filteredIndex);
    });

    const mapOriginalToFiltered = (originalIndex: number): number | null => {
      return originalToFilteredMap.get(originalIndex) ?? null;
    };

    return {
      filteredRows,
      filteredIndices,
      mapFilteredToOriginal,
      mapOriginalToFiltered,
    };
  }, [rows, filter.prompts, filter.actions, filter.reviewStatus, parsedCache]);
}
