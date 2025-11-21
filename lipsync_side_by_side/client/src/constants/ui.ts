// UI Constants for ratings, display, and interactions

// Rating System
export const MIN_STAR_RATING: number = 1;
export const MAX_STAR_RATING: number = 5;
export const STAR_RATING_RANGE: readonly number[] = [1, 2, 3, 4, 5] as const;
export const INITIAL_RATING: number = 0;
export const MIN_VALID_RATING: number = 1;

// Issues & Feedback
export const INITIAL_ISSUES: readonly never[] = [];
export const NO_ISSUES: number = 0;
export const SINGLE_ISSUE: number = 1;
export const DROPDOWN_CLOSE_DELAY_MS: number = 200;

// Display Formatting
export const RATING_DECIMAL_PLACES: number = 2;
export const RATING_DISPLAY_DECIMALS: number = 2;
export const PERCENTAGE_DECIMAL_PLACES: number = 1;
export const PERCENTAGE_MULTIPLIER: number = 100;
export const MIN_PERCENT: number = 0;
export const MAX_PERCENT: number = 100;
export const JSON_INDENT_SPACES: number = 2;

// Pluralization
export const SINGULAR_THRESHOLD: number = 1;

// Results & Statistics
export const INITIAL_PREFERENCES: number = 0;
export const MIN_RATINGS_FOR_AVERAGE: number = 0;
export const TOP_ISSUES_COUNT: number = 5;

// Indices & Navigation
export const FIRST_INDEX: number = 0;
export const LAST_INDEX_OFFSET: number = 1;
export const ARRAY_INDEX_OFFSET: number = 1;

// Timing & Delays
export const CONFIG_LOAD_DELAY_MS: number = 100;
