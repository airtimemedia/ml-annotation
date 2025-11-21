# TTS Checkpoint API Deployment Guide

## Overview
Deploying Haitong, Zbigniew, and Julian's TTS checkpoint models as a REST API service on EC2.

## Current Status

### EC2 Instance
- **Instance ID**: `i-07f3c7073a6cff8b5`
- **Public IP**: `18.218.255.230`
- **Instance Type**: g4dn.xlarge (1x NVIDIA T4 GPU, 4 vCPUs, 16GB RAM)
- **Storage**: 200GB gp3
- **SSH Key**: `~/.ssh/nicholas-checkpoint-api.pem`
- **Security Group**: `sg-0f49a195feaa9f304` (ports 22, 8000 open)

### Setup Progress
Currently installing:
1. ✅ Ubuntu 22.04 base
2. ⏳ NVIDIA GPU drivers
3. ⏳ Python 3 + pip
4. ⏳ PyTorch with CUDA 11.8
5. ⏳ FastAPI + uvicorn
6. ⏳ TTS-team repository (requires SSH access to clone)

## SSH Access
```bash
ssh -i ~/.ssh/nicholas-checkpoint-api.pem ubuntu@18.218.255.230
```

## Next Steps (After Setup Completes)

### 1. Clone TTS-team Repository
The TTS-team repo is private and requires SSH access:

```bash
# On EC2 instance
cd ~
git clone git@github.com:cantina-space/TTS-team.git
cd TTS-team
pip3 install -e .
```

**Alternative if SSH key not available:**
- Use HTTPS with personal access token
- Or copy the TTS repo from your local machine

### 2. Start the API Server
```bash
# On EC2 instance
cd ~
python3 api_server.py
```

The server will:
- Listen on port 8000
- Expose endpoints: `/health`, `/clone_speaker`, `/tts`
- Lazy-load models from S3 on first use
- Cache models in memory after loading

### 3. Test the API

```bash
# From your local machine
# Test health endpoint
curl http://18.218.255.230:8000/health

# Should return:
# {"status":"healthy","gpu_available":true,"available_checkpoints":["haitong","zbigniew","julian"]}
```

### 4. Update Side-by-Side App Configuration

Update `.env` file:
```bash
CHECKPOINT_API_URL=http://18.218.255.230:8000
```

Restart the Flask server:
```bash
cd /Users/nicholasbern/src/ml-annotation/tts_side_by_side
# Kill existing server
# Restart: python server/app/main.py
```

### 5. Test in the App

1. Go to http://localhost:5002
2. Select "YTTS" provider
3. Choose one of the checkpoint models:
   - Haitong's Candidate
   - Zbigniew's Candidate
   - Julian's Candidate
4. Upload reference audio
5. Generate speech
6. Compare side-by-side with other providers

## API Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "gpu_available": true,
  "available_checkpoints": ["haitong", "zbigniew", "julian"]
}
```

### POST /clone_speaker
Clone a voice from audio.

**Request:**
```json
{
  "wav_base64": "<base64-encoded-wav-file>",
  "checkpoint": "haitong"
}
```

**Response:**
```json
{
  "style_latent": [[float, float, ...]]
}
```

### POST /tts
Generate speech from text.

**Request:**
```json
{
  "text": "Hello, this is a test.",
  "style_latent": [[float, float, ...]],
  "checkpoint": "haitong",
  "temperature": 0.9,
  "top_p": 0.85,
  "top_k": 230
}
```

**Response:**
```
"<base64-encoded-wav-audio>"
```

## Checkpoint Models

### Haitong's Candidate
- **Path**: `s3://cantina-tts-checkpoints-us-east-2/runs/Kece_TTS_ParaLinguistic/KeceTTS_v3_para_new_GRPO_v1.../epoch0x3d0-step0x3d1200.ckpt`
- **Description**: ParaLinguistic GRPO v1 (epoch 0, step 1200)

### Zbigniew's Candidate
- **Path**: `s3://cantina-tts-checkpoints-us-east-2/runs/Kece_TTS_GRPO/KeceTTS_v3_grpo_simple_ver2.../epoch0x3d0-step0x3d450.ckpt`
- **Description**: Simple GRPO v2 (epoch 0, step 450)

### Julian's Candidate
- **Path**: `s3://cantina-tts-checkpoints-us-east-2/runs/Kece_DPO/KeceTTS_v3_para_beta_0.1_mTurk_gradio_bf16.../last.ckpt`
- **Description**: DPO beta 0.1 (mTurk gradio bf16)

## Troubleshooting

### GPU Not Detected
```bash
# Check NVIDIA driver installation
nvidia-smi

# If not working, reboot instance
sudo reboot
```

### S3 Access Issues
The instance needs AWS credentials to access S3 buckets. Either:
1. Add IAM role to instance with S3 read access
2. Configure AWS credentials manually:
   ```bash
   aws configure
   ```

### Model Loading Slow
First load downloads models from S3 (~10GB total):
- GPT checkpoint: ~2-3GB
- Decoder: ~1-2GB
- Other assets: ~500MB

Subsequent loads use cached models.

### Port 8000 Not Accessible
Check security group allows inbound traffic on port 8000:
```bash
aws ec2 describe-security-groups \
    --group-ids sg-0f49a195feaa9f304 \
    --region us-east-2 \
    --profile ml-sandbox
```

## Cost Estimate

g4dn.xlarge pricing:
- **On-Demand**: ~$0.526/hour (~$378/month if running 24/7)
- **Spot**: ~$0.16/hour (~$115/month)

**Recommendation**: Use Spot instance for cost savings if testing, or set up auto-stop when not in use.

## Files Created

1. `/Users/nicholasbern/src/TTS-team/cluster/tts_image/api_server.py` - FastAPI server
2. `/Users/nicholasbern/src/ml-annotation/tts_side_by_side/server/app/services/checkpoint_service.py` - Client service
3. `~/.ssh/nicholas-checkpoint-api.pem` - SSH private key

## App Integration Status

✅ Frontend updated (`client/src/providers/ytts.js`)
✅ Backend service created (`server/app/services/checkpoint_service.py`)
✅ YTTS service delegates to checkpoint service
✅ API server code written
⏳ EC2 instance setup in progress
⏳ API server deployment pending
⏳ Testing pending
