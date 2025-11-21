#!/usr/bin/env python3
"""Test script for checkpoint API endpoints."""

import base64
import json
import sys
import wave
import struct
import math
import requests

API_URL = "http://18.218.255.230:8000"

def generate_test_audio(filename: str, duration: float = 1.0, sample_rate: int = 22050):
    """Generate a simple sine wave test audio file."""
    frequency = 440.0  # A4 note
    num_samples = int(sample_rate * duration)

    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)

        for i in range(num_samples):
            value = int(32767.0 * 0.3 * math.sin(2.0 * math.pi * frequency * i / sample_rate))
            wav_file.writeframes(struct.pack('h', value))

    print(f"✓ Generated test audio: {filename}")

def test_health():
    """Test the /health endpoint."""
    print("\n=== Testing /health endpoint ===")
    response = requests.get(f"{API_URL}/health", timeout=10)

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Health check passed")
        print(f"  Status: {data['status']}")
        print(f"  GPU Available: {data['gpu_available']}")
        print(f"  Available Checkpoints: {data['available_checkpoints']}")
        return True
    else:
        print(f"✗ Health check failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return False

def test_clone_speaker(audio_file: str, checkpoint: str = "haitong"):
    """Test the /clone_speaker endpoint."""
    print(f"\n=== Testing /clone_speaker endpoint (checkpoint: {checkpoint}) ===")

    # Read and encode audio file
    with open(audio_file, 'rb') as f:
        audio_bytes = f.read()
    wav_base64 = base64.b64encode(audio_bytes).decode('utf-8')

    # Call API
    response = requests.post(
        f"{API_URL}/clone_speaker",
        json={"wav_base64": wav_base64, "checkpoint": checkpoint},
        timeout=120
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Clone speaker successful")
        print(f"  Style latent shape: {len(data['style_latent'])}x{len(data['style_latent'][0]) if data['style_latent'] else 0}")
        return data['style_latent']
    else:
        print(f"✗ Clone speaker failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return None

def test_tts(text: str, style_latent, checkpoint: str = "haitong", output_file: str = "test_output.wav"):
    """Test the /tts endpoint."""
    print(f"\n=== Testing /tts endpoint (checkpoint: {checkpoint}) ===")
    print(f"  Text: \"{text}\"")

    # Call API
    response = requests.post(
        f"{API_URL}/tts",
        json={
            "text": text,
            "style_latent": style_latent,
            "checkpoint": checkpoint,
            "temperature": 0.9,
            "top_p": 0.85,
            "top_k": 230
        },
        timeout=300
    )

    if response.status_code == 200:
        audio_base64 = response.json()
        audio_bytes = base64.b64decode(audio_base64)

        # Save output
        with open(output_file, 'wb') as f:
            f.write(audio_bytes)

        print(f"✓ TTS generation successful")
        print(f"  Output saved to: {output_file}")
        print(f"  Output size: {len(audio_bytes)} bytes")
        return True
    else:
        print(f"✗ TTS generation failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return False

def main():
    """Run all tests."""
    print("=" * 60)
    print("Checkpoint API Test Suite")
    print("=" * 60)

    # Test 1: Health check
    if not test_health():
        print("\n✗ Health check failed, aborting tests")
        sys.exit(1)

    # Test 2: Generate test audio
    test_audio_file = "/tmp/test_reference.wav"
    generate_test_audio(test_audio_file)

    # Test 3: Test each checkpoint
    checkpoints = ["haitong", "zbigniew", "julian"]
    test_text = "Hello, this is a test of the text to speech system."

    all_passed = True
    for checkpoint in checkpoints:
        print(f"\n{'=' * 60}")
        print(f"Testing Checkpoint: {checkpoint.upper()}")
        print(f"{'=' * 60}")

        # Clone speaker
        style_latent = test_clone_speaker(test_audio_file, checkpoint)
        if style_latent is None:
            print(f"✗ Skipping TTS test for {checkpoint} (clone failed)")
            all_passed = False
            continue

        # Generate speech
        output_file = f"/tmp/test_output_{checkpoint}.wav"
        if not test_tts(test_text, style_latent, checkpoint, output_file):
            print(f"✗ TTS test failed for {checkpoint}")
            all_passed = False
        else:
            print(f"✓ All tests passed for {checkpoint}")

    # Summary
    print(f"\n{'=' * 60}")
    print("Test Summary")
    print(f"{'=' * 60}")
    if all_passed:
        print("✓ All tests passed!")
        sys.exit(0)
    else:
        print("✗ Some tests failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
