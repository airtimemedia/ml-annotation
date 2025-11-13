import { useMemo } from 'react';
import { DatasetRow, ParsedOutput, ParsedInput } from '../types/index';

export interface ParsedRowData {
  parsedOutput: ParsedOutput | null;
  parsedInput: ParsedInput | null;
  parseError: boolean;
}

/**
 * Creates a cached map of parsed row data to avoid re-parsing JSON on every operation
 * This is a critical performance optimization for large datasets
 */
export function useParsedRowCache(rows: DatasetRow[]): Map<DatasetRow, ParsedRowData> {
  return useMemo(() => {
    const cache = new Map<DatasetRow, ParsedRowData>();

    for (const row of rows) {
      let parsedOutput: ParsedOutput | null = null;
      let parsedInput: ParsedInput | null = null;
      let parseError = false;

      // Parse output JSON
      try {
        parsedOutput = JSON.parse(row.unified_format_output_enriched_fixed);
      } catch {
        parseError = true;
      }

      // Parse input JSON (optional)
      try {
        parsedInput = JSON.parse(row.new_room_unified_format_input);
      } catch {
        // Input parsing is optional
      }

      cache.set(row, { parsedOutput, parsedInput, parseError });
    }

    return cache;
  }, [rows]);
}
