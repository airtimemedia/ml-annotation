"""Audio utility functions"""
import os
import subprocess
import tempfile
from app.constants import ALLOWED_AUDIO_EXTENSIONS


def validate_audio_file(file_extension: str) -> bool:
    """
    Validate if file extension is an allowed audio format.

    Args:
        file_extension: File extension (e.g., '.wav', '.mp3')

    Returns:
        True if valid, False otherwise
    """
    return file_extension.lower() in ALLOWED_AUDIO_EXTENSIONS


def convert_to_wav(input_path: str) -> str:
    """
    Convert audio file to WAV format using ffmpeg.

    Args:
        input_path: Path to input audio file (can be any format supported by ffmpeg)

    Returns:
        Path to converted WAV file (a new temp file)

    Raises:
        RuntimeError: If ffmpeg conversion fails
    """
    # If already WAV, return as-is
    if input_path.lower().endswith('.wav'):
        print(f"[AUDIO UTILS] File is already WAV format: {input_path}")
        return input_path

    print(f"[AUDIO UTILS] Converting {input_path} to WAV format")

    # Create temp file for WAV output
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        output_path = tmp.name

    try:
        # Use ffmpeg to convert to WAV
        # -y: overwrite output file without asking
        # -i: input file
        # -acodec pcm_s16le: PCM signed 16-bit little-endian (standard WAV format)
        # -ar 16000: 16kHz sample rate (good for speech)
        # -ac 1: mono audio
        cmd = [
            'ffmpeg',
            '-y',
            '-i', input_path,
            '-acodec', 'pcm_s16le',
            '-ar', '16000',
            '-ac', '1',
            output_path
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg conversion failed: {result.stderr}")

        # Verify the output file was created and has content
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise RuntimeError("ffmpeg produced an empty or missing output file")

        print(f"[AUDIO UTILS] ✓ Conversion successful: {output_path} ({os.path.getsize(output_path)} bytes)")
        return output_path

    except Exception as e:
        # Clean up output file if it was created
        if os.path.exists(output_path):
            os.unlink(output_path)
        print(f"[AUDIO UTILS] ✗ Conversion failed: {e}")
        raise
