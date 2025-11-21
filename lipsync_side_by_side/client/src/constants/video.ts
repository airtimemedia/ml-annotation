// Video Player & Synchronization Constants

// Video synchronization
export const VIDEO_SYNC_THRESHOLD_SEC: number = 0.05; // Time drift tolerance in seconds (50ms)
export const SYNC_CORRECTION_COOLDOWN_MS: number = 100; // Min time between sync corrections (100ms)
export const SEEKING_CLEAR_DELAY_MS: number = 10; // Delay before clearing seeking flag

// Video states
export const VIDEO_READY_STATE_THRESHOLD: number = 3; // HTMLMediaElement.HAVE_FUTURE_DATA
export const MIN_VIDEO_TIME: number = 0;
export const INITIAL_TIME: number = 0;
export const INITIAL_DURATION: number = 0;
export const INITIAL_PROGRESS: number = 0;

// Frame rate assumptions
export const DEFAULT_VIDEO_FPS: number = 30;
export const FRAME_STEP_TIME: number = 1 / DEFAULT_VIDEO_FPS;

// Video controls
export const SEEK_THROTTLE_MS: number = 16; // ~60fps for seek operations
export const DRAG_END_CLICK_DELAY_MS: number = 10;

// Time display
export const DEFAULT_TIME: number = 0;
export const SECONDS_PER_MINUTE: number = 60;
export const TIME_DISPLAY_PADDING: number = 2;
export const TIME_DISPLAY_PAD_CHAR: string = '0';

// Waveform
export const DEFAULT_WAVEFORM_BARS: number = 100;
export const WAVEFORM_HEIGHT_PERCENT: number = 100;
export const TIMELINE_PIXELS_PER_SECOND: number = 300;

// Transcript
export const TRANSCRIPTION_MIN_TIME_SEC: number = 30;
export const TRANSCRIPTION_MAX_TIME_SEC: number = 60;
export const NO_AUDIO_ERROR_TEXT: string = 'no audio';
export const DUMMY_TRANSCRIPT_DELAY_MS: number = 500;

// Layout calculations
export const CENTER_OFFSET_DIVISOR: number = 2;
