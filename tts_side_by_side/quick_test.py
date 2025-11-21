#!/usr/bin/env python3
"""Quick test of both endpoints."""

import base64
import requests
import wave
import struct
import math

API_URL = "http://18.218.255.230:8000"

# Generate simple test audio
def gen_audio():
    with wave.open("/tmp/quick_test.wav", 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(22050)
        for i in range(22050):
            value = int(32767.0 * 0.3 * math.sin(2.0 * math.pi * 440.0 * i / 22050))
            f.writeframes(struct.pack('h', value))
    return "/tmp/quick_test.wav"

print("Generating test audio...")
audio_file = gen_audio()

# Test clone_speaker
print("\nTesting /clone_speaker (may take 2-3 min for first request)...")
with open(audio_file, 'rb') as f:
    wav_base64 = base64.b64encode(f.read()).decode('utf-8')

response = requests.post(
    f"{API_URL}/clone_speaker",
    json={"wav_base64": wav_base64, "checkpoint": "haitong"},
    timeout=300
)

if response.status_code == 200:
    data = response.json()
    print(f"✓ Clone successful! Style latent shape: {len(data['style_latent'])}x{len(data['style_latent'][0])}")

    # Test TTS
    print("\nTesting /tts (may take 2-3 min)...")
    tts_response = requests.post(
        f"{API_URL}/tts",
        json={
            "text": "Hello, this is a test.",
            "style_latent": data['style_latent'],
            "checkpoint": "haitong",
            "temperature": 0.9,
            "top_p": 0.85,
            "top_k": 230
        },
        timeout=300
    )

    if tts_response.status_code == 200:
        audio_bytes = base64.b64decode(tts_response.json())
        with open("/tmp/quick_test_output.wav", 'wb') as f:
            f.write(audio_bytes)
        print(f"✓ TTS successful! Output: /tmp/quick_test_output.wav ({len(audio_bytes)} bytes)")
        print("\n✓✓✓ Both endpoints working! ✓✓✓")
    else:
        print(f"✗ TTS failed: {tts_response.status_code}")
        print(f"  Response: {tts_response.text}")
else:
    print(f"✗ Clone failed: {response.status_code}")
    print(f"  Response: {response.text}")
