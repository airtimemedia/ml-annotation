import type { Video, VideoAnnotation } from '../types';

/**
 * Parse CSV text into annotation records
 */
export function parseCSV(text: string): Record<string, VideoAnnotation> {
  const lines = text.split('\n');
  if (lines.length < 2) return {};

  const headers = lines[0].split(',').map((h) => h.trim());
  const data: Record<string, VideoAnnotation> = {};

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = parseCSVLine(lines[i]);
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    if (row.path) {
      data[row.path] = row;
    }
  }

  return data;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

/**
 * Generate CSV from videos and annotations
 */
export function generateCSV(
  videos: Video[],
  annotations: Record<string, VideoAnnotation>
): string {
  const headers = [
    'path',
    'source',
    'content_type',
    'direction',
    'size',
    'include',
    'category',
    'notes',
    'last_updated',
  ];

  let csv = headers.join(',') + '\n';

  videos.forEach((video) => {
    const annotation = annotations[video.path] || {};

    const values = headers.map((header) => {
      const value = header === 'path' ? video.path : annotation[header as keyof VideoAnnotation] || '';

      // Escape values with commas or quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });

    csv += values.join(',') + '\n';
  });

  return csv;
}
