import { useMemo } from 'react';
import { DatasetRow, FilterState, ReviewStatusFilter } from '../types';
import type { ParsedRowData } from './useParsedRowCache';

export interface FilteredCount {
  total: number;
  filtered: number;
}

export interface FilteredMetrics {
  promptCounts: Record<string, FilteredCount>;
  actionCounts: Record<string, FilteredCount>;
  reviewedCount: FilteredCount;
  notReviewedCount: FilteredCount;
}

/**
 * Custom hook to compute filtered metrics for each filter value
 * Shows both total count and count after current filters are applied
 */
export function useFilteredMetrics(
  rows: DatasetRow[],
  filter: FilterState,
  parsedCache: Map<DatasetRow, ParsedRowData>
): FilteredMetrics {
  return useMemo(() => {
    const promptCounts: Record<string, FilteredCount> = {};
    const actionCounts: Record<string, FilteredCount> = {};
    let reviewedTotal = 0;
    let reviewedFiltered = 0;
    let notReviewedTotal = 0;
    let notReviewedFiltered = 0;

    // Helper function to check if a row matches current filters EXCEPT for a specific filter type
    const rowMatchesOtherFilters = (
      row: DatasetRow,
      cached: ParsedRowData,
      excludeType: 'prompt' | 'action' | 'reviewStatus'
    ): boolean => {
      // Check prompt filter (unless excluded)
      if (excludeType !== 'prompt' && filter.prompts.size > 0) {
        if (!filter.prompts.has(row.prompt_name)) {
          return false;
        }
      }

      // Check action filter (unless excluded)
      if (excludeType !== 'action' && filter.actions.size > 0) {
        const actionType = (!cached.parseError && cached.parsedOutput?.action)
          ? cached.parsedOutput.action
          : 'invalid';
        if (!filter.actions.has(actionType)) {
          return false;
        }
      }

      // Check review status filter (unless excluded)
      if (excludeType !== 'reviewStatus' && filter.reviewStatus.size > 0) {
        const isReviewed = row.manually_reviewed === true;
        const matchesReviewStatus =
          (filter.reviewStatus.has('reviewed') && isReviewed) ||
          (filter.reviewStatus.has('not-reviewed') && !isReviewed);
        if (!matchesReviewStatus) {
          return false;
        }
      }

      return true;
    };

    // Single pass through all rows
    rows.forEach((row) => {
      const cached = parsedCache.get(row)!;
      const promptName = row.prompt_name;
      const actionType = (!cached.parseError && cached.parsedOutput?.action)
        ? cached.parsedOutput.action
        : 'invalid';
      const isReviewed = row.manually_reviewed === true;

      // Initialize counts if not exists
      if (!promptCounts[promptName]) {
        promptCounts[promptName] = { total: 0, filtered: 0 };
      }
      if (!actionCounts[actionType]) {
        actionCounts[actionType] = { total: 0, filtered: 0 };
      }

      // Count totals (no filters)
      promptCounts[promptName].total++;
      actionCounts[actionType].total++;
      if (isReviewed) {
        reviewedTotal++;
      } else {
        notReviewedTotal++;
      }

      // Count filtered amounts (with all OTHER filters applied)
      // For prompts: check if row matches all filters except prompt filter, AND has this prompt
      if (rowMatchesOtherFilters(row, cached, 'prompt')) {
        promptCounts[promptName].filtered++;
      }

      // For actions: check if row matches all filters except action filter, AND has this action
      if (rowMatchesOtherFilters(row, cached, 'action')) {
        actionCounts[actionType].filtered++;
      }

      // For review status: check if row matches all filters except review status filter
      if (rowMatchesOtherFilters(row, cached, 'reviewStatus')) {
        if (isReviewed) {
          reviewedFiltered++;
        } else {
          notReviewedFiltered++;
        }
      }
    });

    return {
      promptCounts,
      actionCounts,
      reviewedCount: { total: reviewedTotal, filtered: reviewedFiltered },
      notReviewedCount: { total: notReviewedTotal, filtered: notReviewedFiltered },
    };
  }, [rows, filter.prompts, filter.actions, filter.reviewStatus, parsedCache]);
}
