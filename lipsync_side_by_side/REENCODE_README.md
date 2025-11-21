# Video Re-encoding Script

This script downloads all videos from S3, re-encodes them to browser-compatible format, and uploads them to a new location.

## Prerequisites

1. **FFmpeg installed** (required for re-encoding):
   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   sudo apt install ffmpeg
   ```

2. **Python 3.7+** with boto3:
   ```bash
   pip install -r reencode_requirements.txt
   ```

## What it does

- **Source:** `s3://cantina-ground-truth-datasets/200-videos-20251025/`
- **Destination:** `s3://cantina-ground-truth-datasets/200-videos-20251025-reencoded/`
- **Preserves folder structure** (ground-truth/, lipsync--flashsync/, etc.)
- **Re-encodes to browser-compatible format:**
  - H.264 video codec (main profile)
  - AAC audio codec
  - Fast start enabled (streaming)
  - YUV420p pixel format

## Usage

```bash
cd /Users/nicholasbern/src/video-compare/v3
python3 reencode_s3_videos.py
```

The script will:
1. List all videos in the source location
2. Ask for confirmation
3. Process each video (download → re-encode → upload)
4. Show progress and summary

## Notes

- **AWS credentials are embedded** in the script (temporary session token)
- **Credentials expire** - if you get auth errors, you'll need new credentials
- **Takes time** - re-encoding ~200 videos could take hours depending on video size/length
- **Temporary files** are created in /tmp and cleaned up automatically
- **Original videos** in S3 are NOT modified - re-encoded versions go to new location

## After re-encoding

Update your config JSON to point to the new location:
```json
{
  "video_pairs": [
    {
      "model_1": "https://cantina-ground-truth-datasets.s3.us-east-2.amazonaws.com/200-videos-20251025-reencoded/ground-truth/veo31_video_0001.mp4",
      "model_2": "https://cantina-ground-truth-datasets.s3.us-east-2.amazonaws.com/200-videos-20251025-reencoded/lipsync--flashsync/veo31_video_0001.mp4"
    }
  ]
}
```

Or use a find/replace:
- Find: `200-videos-20251025/`
- Replace: `200-videos-20251025-reencoded/`
