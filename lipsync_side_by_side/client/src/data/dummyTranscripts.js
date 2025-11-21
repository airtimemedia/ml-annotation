/**
 * Dummy transcript data for UI testing
 * These transcripts are used to test the transcript display and synchronization
 * without requiring actual API calls or video processing
 */

export const dummyTranscript1 = {
  text: "Hello, this is a sample transcript for the first video. It demonstrates how the text will appear and sync with the video playback. Each word is highlighted as it's spoken.",
  words: [
    { text: "Hello,", start: 0.0, end: 0.5 },
    { text: "this", start: 0.5, end: 0.7 },
    { text: "is", start: 0.7, end: 0.85 },
    { text: "a", start: 0.85, end: 0.95 },
    { text: "sample", start: 0.95, end: 1.3 },
    { text: "transcript", start: 1.3, end: 1.8 },
    { text: "for", start: 1.8, end: 2.0 },
    { text: "the", start: 2.0, end: 2.15 },
    { text: "first", start: 2.15, end: 2.5 },
    { text: "video.", start: 2.5, end: 3.0 },
    { text: "It", start: 3.2, end: 3.35 },
    { text: "demonstrates", start: 3.35, end: 4.0 },
    { text: "how", start: 4.0, end: 4.2 },
    { text: "the", start: 4.2, end: 4.35 },
    { text: "text", start: 4.35, end: 4.65 },
    { text: "will", start: 4.65, end: 4.85 },
    { text: "appear", start: 4.85, end: 5.3 },
    { text: "and", start: 5.3, end: 5.5 },
    { text: "sync", start: 5.5, end: 5.85 },
    { text: "with", start: 5.85, end: 6.05 },
    { text: "the", start: 6.05, end: 6.2 },
    { text: "video", start: 6.2, end: 6.6 },
    { text: "playback.", start: 6.6, end: 7.2 },
    { text: "Each", start: 7.4, end: 7.7 },
    { text: "word", start: 7.7, end: 8.0 },
    { text: "is", start: 8.0, end: 8.15 },
    { text: "highlighted", start: 8.15, end: 8.8 },
    { text: "as", start: 8.8, end: 9.0 },
    { text: "it's", start: 9.0, end: 9.25 },
    { text: "spoken.", start: 9.25, end: 9.8 }
  ],
  language_code: "en",
  language_probability: 0.99
};

export const dummyTranscript2 = {
  text: "This is the second video's transcript. The lip-sync quality can be evaluated by comparing the text synchronization with the visual mouth movements on screen.",
  words: [
    { text: "This", start: 0.0, end: 0.3 },
    { text: "is", start: 0.3, end: 0.45 },
    { text: "the", start: 0.45, end: 0.6 },
    { text: "second", start: 0.6, end: 1.0 },
    { text: "video's", start: 1.0, end: 1.5 },
    { text: "transcript.", start: 1.5, end: 2.2 },
    { text: "The", start: 2.4, end: 2.6 },
    { text: "lip-sync", start: 2.6, end: 3.1 },
    { text: "quality", start: 3.1, end: 3.6 },
    { text: "can", start: 3.6, end: 3.8 },
    { text: "be", start: 3.8, end: 3.95 },
    { text: "evaluated", start: 3.95, end: 4.6 },
    { text: "by", start: 4.6, end: 4.8 },
    { text: "comparing", start: 4.8, end: 5.4 },
    { text: "the", start: 5.4, end: 5.55 },
    { text: "text", start: 5.55, end: 5.85 },
    { text: "synchronization", start: 5.85, end: 6.8 },
    { text: "with", start: 6.8, end: 7.0 },
    { text: "the", start: 7.0, end: 7.15 },
    { text: "visual", start: 7.15, end: 7.6 },
    { text: "mouth", start: 7.6, end: 7.95 },
    { text: "movements", start: 7.95, end: 8.5 },
    { text: "on", start: 8.5, end: 8.7 },
    { text: "screen.", start: 8.7, end: 9.2 }
  ],
  language_code: "en",
  language_probability: 0.98
};
