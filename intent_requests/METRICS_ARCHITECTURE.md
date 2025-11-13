# Metrics Architecture

## Overview

The intent annotation UI now includes a rich, scalable metrics system that efficiently processes and displays dataset statistics. The architecture is optimized for performance using memoization and single-pass algorithms.

## Data Structures

### Core Types (`src/types/index.ts`)

```typescript
// Parsed JSON structures
interface ParsedOutput {
  action?: string;
  requester?: string;
  requested_users?: string[];
  action_metadata?: Record<string, any>;
  [key: string]: any;
}

interface ParsedInput {
  room_members?: any[];
  chat_history?: string;
  last_message?: string;
  [key: string]: any;
}

// Rich metrics aggregation
interface DatasetMetrics {
  totalRows: number;
  reviewedCount: number;
  remainingCount: number;
  progressPercent: number;
  promptCounts: Record<string, number>;
  actionCounts: Record<string, number>;
  invalidOutputCount: number;
  metadata: {
    uniqueActions: string[];
    uniquePrompts: string[];
    parseErrorIndices: number[];
  };
}

// Indexed row data for efficient lookups
interface IndexedRowData {
  row: DatasetRow;
  index: number;
  parsedOutput: ParsedOutput | null;
  parsedInput: ParsedInput | null;
  parseError: boolean;
}
```

## Architecture Components

### 1. useDatasetMetrics Hook (`src/hooks/useDatasetMetrics.ts`)

**Purpose**: Centralized metrics computation with performance optimization

**Key Features**:
- **Two-stage memoization**:
  1. Parse all JSON data once (memoized on `rows`)
  2. Compute metrics in single pass (memoized on `indexedData` + `reviewedRows`)
- **Single-pass algorithm**: All metrics computed in one iteration
- **O(1) action/prompt lookups**: Uses hash maps for counting
- **Reusable parsing**: `parseRowData()` helper for individual row parsing

**Performance**:
- Initial parse: O(n) where n = number of rows
- Metrics computation: O(n)
- Memoized results: O(1) on subsequent renders with same data
- Memory: O(n) for indexed data structure

### 2. MetricsPanel Component

**Displays**:
- **Overview Stats**: Total, reviewed, remaining, progress %, invalid outputs
- **Prompts Breakdown**: Count per prompt type (sorted descending)
- **Actions Breakdown**: Count per action type (sorted descending)

**Features**:
- Collapsible panel to save screen space
- Two-column grid layout for breakdowns
- Empty state for missing action data
- Responsive mobile layout

### 3. NavigationControls Component

**Enhanced with**:
- Action type display per row
- Reuses `parseRowData()` for consistency
- 4-column grid: Row # | Prompt | Action | Status

## Scalability

### Adding New Metrics

To add new metric types:

1. **Update Types**:
```typescript
interface DatasetMetrics {
  // ... existing fields
  newMetricCounts: Record<string, number>;
}
```

2. **Update Hook**:
```typescript
// In useDatasetMetrics, add to single-pass loop:
if (parsedOutput?.newField) {
  const value = parsedOutput.newField;
  newMetricCounts[value] = (newMetricCounts[value] || 0) + 1;
}
```

3. **Update UI**:
```typescript
// In MetricsPanel.tsx
<div className="metrics-panel__section">
  <h4>New Metric Breakdown</h4>
  <div className="breakdown-list">
    {Object.entries(metrics.newMetricCounts)...}
  </div>
</div>
```

### Performance Considerations

- **Parsing is cached**: JSON parsing only happens when `rows` change
- **Metrics update on review**: Only `reviewedRows` changes trigger re-computation of review stats
- **Render optimization**: Memoized metrics prevent unnecessary re-renders
- **Memory trade-off**: IndexedRowData structure trades memory for speed (acceptable for datasets < 100k rows)

## Usage Example

```typescript
import { useDatasetMetrics } from '@/hooks/useDatasetMetrics';

function MyComponent({ rows, reviewedRows }) {
  // Automatically memoized and optimized
  const metrics = useDatasetMetrics(rows, reviewedRows);

  return (
    <div>
      <p>Total Actions: {Object.keys(metrics.actionCounts).length}</p>
      <p>Invalid Outputs: {metrics.invalidOutputCount}</p>
      {/* Access any metric field */}
    </div>
  );
}
```

## Future Enhancements

Potential additions that fit this architecture:

1. **Requester Breakdown**: Count by `parsedOutput.requester`
2. **User Mentions**: Count `requested_users` frequency
3. **Metadata Analysis**: Extract patterns from `action_metadata`
4. **Input Analysis**: Parse room_members, chat_history patterns
5. **Time-based Metrics**: Track annotation speed, session duration
6. **Quality Metrics**: Track edit distance, validation errors
7. **Export Capabilities**: CSV/JSON export of metrics data

All can be added by extending the single-pass algorithm in `useDatasetMetrics`.
