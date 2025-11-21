/**
 * Generate waveform data from a video URL using Web Audio API
 * No FFmpeg or server-side processing required!
 * IMPORTANT: Does NOT touch the video element's audio routing
 */

export async function generateWaveformFromVideo(videoElement, numBars = 500) {
  try {
    // Fetch the video file separately (don't touch the video element!)
    const response = await fetch(videoElement.src);
    const arrayBuffer = await response.arrayBuffer();

    // Create audio context for decoding only
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get audio samples (channel 0)
    const samples = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(samples.length / numBars));

    const waveform = [];

    // Calculate RMS for each block
    for (let i = 0; i < numBars; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, samples.length);

      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += samples[j] * samples[j];
      }

      const rms = Math.sqrt(sum / (end - start));
      waveform.push(rms);
    }

    // Normalize to 0-1 range
    const maxVal = Math.max(...waveform);
    const normalized = maxVal > 0
      ? waveform.map(val => val / maxVal)
      : waveform;

    // Close audio context to free resources
    audioContext.close();

    console.log(`[Waveform] Generated ${normalized.length} bars from audio`);
    return normalized;

  } catch (error) {
    console.error('[Waveform] Failed to generate:', error);

    // Return placeholder waveform on error
    return generatePlaceholderWaveform(numBars);
  }
}

/**
 * Generate placeholder waveform for videos without audio or on error
 */
function generatePlaceholderWaveform(numBars) {
  return Array.from({ length: numBars }, () => 0.05 + Math.random() * 0.05);
}
