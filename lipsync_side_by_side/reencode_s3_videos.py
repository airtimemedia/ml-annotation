#!/usr/bin/env python3
"""
Re-encode all videos from S3 to browser-compatible format and upload to new location.
"""

import os
import sys
import subprocess
import tempfile
from pathlib import Path
import boto3
from botocore.exceptions import ClientError

# S3 Configuration
BUCKET_NAME = "cantina-ground-truth-datasets"
SOURCE_PREFIX = "200-videos-20251025/"
DEST_PREFIX = "200-videos-20251025-frameperfect/"

# FFmpeg encoding settings for frame-perfect scrubbing
# All I-frames (every frame is a keyframe) for perfect frame-by-frame navigation
FFMPEG_SETTINGS = [
    "-c:v", "libx264",           # H.264 codec
    "-profile:v", "high",        # High profile for better quality
    "-level", "4.1",             # Level 4.1
    "-pix_fmt", "yuv420p",       # Pixel format (most compatible)
    "-g", "1",                   # GOP size 1 = every frame is a keyframe (I-frame only)
    "-bf", "0",                  # No B-frames for better scrubbing
    "-sc_threshold", "0",        # Disable scene change detection
    "-c:a", "aac",               # AAC audio codec
    "-ar", "44100",              # 44.1kHz audio sample rate
    "-b:a", "128k",              # 128kbps audio bitrate
    "-movflags", "+faststart",   # Enable streaming (move moov atom to beginning)
    "-crf", "18",                # Higher quality (18 = visually lossless)
]


def create_s3_client():
    """Create S3 client with credentials."""
    return boto3.client(
        's3',
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        aws_session_token=AWS_SESSION_TOKEN
    )


def list_videos(s3_client, prefix):
    """List all video files in the source prefix."""
    videos = []
    paginator = s3_client.get_paginator('list_objects_v2')

    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=prefix):
        if 'Contents' not in page:
            continue

        for obj in page['Contents']:
            key = obj['Key']
            # Only process .mp4 files
            if key.lower().endswith('.mp4'):
                videos.append(key)

    return videos


def download_video(s3_client, s3_key, local_path):
    """Download video from S3."""
    print(f"  Downloading: s3://{BUCKET_NAME}/{s3_key}")
    s3_client.download_file(BUCKET_NAME, s3_key, local_path)


def upload_video(s3_client, local_path, s3_key):
    """Upload video to S3."""
    print(f"  Uploading: s3://{BUCKET_NAME}/{s3_key}")
    s3_client.upload_file(
        local_path,
        BUCKET_NAME,
        s3_key,
        ExtraArgs={'ContentType': 'video/mp4'}
    )


def reencode_video(input_path, output_path):
    """Re-encode video to browser-compatible format using FFmpeg."""
    print(f"  Re-encoding: {input_path}")

    cmd = [
        "ffmpeg",
        "-i", input_path,
        *FFMPEG_SETTINGS,
        "-y",  # Overwrite output
        output_path
    ]

    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            text=True
        )
        print(f"  ✓ Re-encoding complete")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ✗ FFmpeg failed: {e.stderr}")
        return False


def process_video(s3_client, s3_key, temp_dir):
    """Download, re-encode, and upload a single video."""
    # Calculate destination key (preserve subfolder structure)
    relative_path = s3_key.replace(SOURCE_PREFIX, "")
    dest_key = f"{DEST_PREFIX}{relative_path}"

    # Create temp file paths
    original_file = temp_dir / "original.mp4"
    encoded_file = temp_dir / "encoded.mp4"

    try:
        # Download
        download_video(s3_client, s3_key, str(original_file))

        # Re-encode
        if not reencode_video(str(original_file), str(encoded_file)):
            return False

        # Upload
        upload_video(s3_client, str(encoded_file), dest_key)

        return True

    finally:
        # Cleanup
        if original_file.exists():
            original_file.unlink()
        if encoded_file.exists():
            encoded_file.unlink()


def main():
    """Main execution."""
    print("=" * 80)
    print("S3 Video Re-encoding Script")
    print("=" * 80)
    print(f"Source: s3://{BUCKET_NAME}/{SOURCE_PREFIX}")
    print(f"Destination: s3://{BUCKET_NAME}/{DEST_PREFIX}")
    print("=" * 80)

    # Create S3 client
    s3_client = create_s3_client()

    # List all videos
    print("\nListing videos...")
    videos = list_videos(s3_client, SOURCE_PREFIX)
    print(f"Found {len(videos)} videos to process\n")

    if not videos:
        print("No videos found!")
        return

    # Confirm before processing (skip if --yes flag provided)
    skip_confirm = '--yes' in sys.argv or '-y' in sys.argv
    if not skip_confirm:
        response = input(f"Process {len(videos)} videos? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Cancelled.")
            return
    else:
        print(f"Auto-confirmed: Processing {len(videos)} videos...")

    # Process each video
    success_count = 0
    fail_count = 0

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)

        for i, video_key in enumerate(videos, 1):
            print(f"\n[{i}/{len(videos)}] Processing: {video_key}")

            if process_video(s3_client, video_key, temp_path):
                success_count += 1
                print(f"  ✓ Success")
            else:
                fail_count += 1
                print(f"  ✗ Failed")

    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total: {len(videos)}")
    print(f"Success: {success_count}")
    print(f"Failed: {fail_count}")
    print("=" * 80)


if __name__ == "__main__":
    main()
