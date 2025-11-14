import { useMemo } from 'react';
import { DatasetRow, DatasetMetrics, IndexedRowData, ParsedOutput, ParsedInput } from '../types';
import type { ParsedRowData } from './useParsedRowCache';

/**
 * Custom hook to compute dataset metrics efficiently
 * Uses memoization to avoid recomputing on every render
 */
export function useDatasetMetrics(
  rows: DatasetRow[],
  reviewedRows: Set<number>,
  parsedCache: Map<DatasetRow, ParsedRowData>
): DatasetMetrics {
  // Step 1: Build indexed row data using cached parsed JSON (memoized)
  const indexedData = useMemo<IndexedRowData[]>(() => {
    return rows.map((row, index) => {
      const cached = parsedCache.get(row)!;
      return {
        row,
        index,
        parsedOutput: cached.parsedOutput,
        parsedInput: cached.parsedInput,
        parseError: cached.parseError,
      };
    });
  }, [rows, parsedCache]);

  // Step 2: Compute all metrics in a single pass (memoized)
  const metrics = useMemo<DatasetMetrics>(() => {
    const promptCounts: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};
    const parseErrorIndices: number[] = [];
    const uniqueActionsSet = new Set<string>();
    const uniquePromptsSet = new Set<string>();
    let invalidOutputCount = 0;

    // Single pass through indexed data
    for (const data of indexedData) {
      const { row, index, parsedOutput, parseError } = data;

      // Count prompts
      promptCounts[row.prompt_name] = (promptCounts[row.prompt_name] || 0) + 1;
      uniquePromptsSet.add(row.prompt_name);

      // Count actions
      if (parsedOutput?.action) {
        const action = parsedOutput.action;
        actionCounts[action] = (actionCounts[action] || 0) + 1;
        uniqueActionsSet.add(action);
      }

      // Track parse errors
      if (parseError) {
        invalidOutputCount++;
        parseErrorIndices.push(index);
      }
    }

    const totalRows = rows.length;
    const reviewedCount = reviewedRows.size;
    const remainingCount = totalRows - reviewedCount;
    const progressPercent = totalRows > 0 ? Math.round((reviewedCount / totalRows) * 100) : 0;

    return {
      totalRows,
      reviewedCount,
      remainingCount,
      progressPercent,
      promptCounts,
      actionCounts,
      invalidOutputCount,
      metadata: {
        uniqueActions: Array.from(uniqueActionsSet).sort(),
        uniquePrompts: Array.from(uniquePromptsSet).sort(),
        parseErrorIndices,
      },
    };
  }, [indexedData, reviewedRows]);

  return metrics;
}

/**
 * Helper function to get indexed row data for a specific index
 * Useful for displaying row-specific information without re-parsing
 */
export function parseRowData(row: DatasetRow): {
  parsedOutput: ParsedOutput | null;
  parsedInput: ParsedInput | null;
  parseError: boolean;
} {
  let parsedOutput: ParsedOutput | null = null;
  let parsedInput: ParsedInput | null = null;
  let parseError = false;

  try {
    parsedOutput = JSON.parse(row.output);
  } catch {
    parseError = true;
  }

  try {
    parsedInput = JSON.parse(row.input);
  } catch {
    // Input parsing is optional
  }

  return { parsedOutput, parsedInput, parseError };
}
