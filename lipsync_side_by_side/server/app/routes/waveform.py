"""Waveform generation utilities.

NOTE: This module is deprecated and not used on Vercel (no FFmpeg).
- Waveforms are generated client-side in the browser using Web Audio API
- This file kept for reference only
"""

import logging

logger = logging.getLogger(__name__)


class WaveformGenerationError(Exception):
    """Raised when waveform generation fails."""
    pass
