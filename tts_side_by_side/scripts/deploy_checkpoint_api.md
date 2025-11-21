# Checkpoint API Deployment Guide

Quick guide to deploy the TTS checkpoint API to EC2 in minimal steps.

## Prerequisites

- AWS CLI configured with `ml-sandbox` profile
- SSH key pair for EC2 access
- Docker image pushed to ECR: `211125460587.dkr.ecr.us-east-2.amazonaws.com/cantina-tts/tts-team:1.2`

## Quick Deployment (5 Steps)

### 1. Launch EC2 Instance

```bash
cd /Users/nicholasbern/src/TTS-team/cluster/tts_image
./launch_checkpoint_api.sh
```

This script:
- Creates security group (ports 22, 8000)
- Launches g4dn.xlarge instance with Ubuntu 22.04
- Installs Docker + nvidia-docker via user-data
- Pulls and runs the checkpoint API container

**Note the Instance ID and Public IP from the output.**

### 2. Wait for Instance Setup

```bash
# Wait ~5 minutes for user-data script to complete
# Check status:
aws ec2 describe-instances \
    --instance-ids <INSTANCE_ID> \
    --region us-east-2 \
    --profile ml-sandbox \
    --query 'Reservations[0].Instances[0].State.Name'
```

### 3. Verify API is Running

```bash
curl http://<PUBLIC_IP>:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "gpu_available": true,
  "available_checkpoints": ["haitong", "zbigniew", "julian"]
}
```

### 4. Update Local .env

```bash
# In /Users/nicholasbern/src/ml-annotation/.env
CHECKPOINT_API_URL=http://<PUBLIC_IP>:8000
```

### 5. Restart Flask Server

```bash
cd /Users/nicholasbern/src/ml-annotation/tts_side_by_side
# Kill existing server if running
python server/app/main.py
```

## Manual Deployment (If Script Fails)

### Step 1: Create Security Group

```bash
aws ec2 create-security-group \
    --group-name checkpoint-api-sg \
    --description "TTS Checkpoint API" \
    --region us-east-2 \
    --profile ml-sandbox

# Allow ports 22 and 8000
aws ec2 authorize-security-group-ingress \
    --group-name checkpoint-api-sg \
    --protocol tcp --port 22 --cidr 0.0.0.0/0 \
    --region us-east-2 --profile ml-sandbox

aws ec2 authorize-security-group-ingress \
    --group-name checkpoint-api-sg \
    --protocol tcp --port 8000 --cidr 0.0.0.0/0 \
    --region us-east-2 --profile ml-sandbox
```

### Step 2: Launch Instance

```bash
aws ec2 run-instances \
    --image-id ami-0911fd09f1f167a99 \
    --instance-type g4dn.xlarge \
    --key-name <YOUR_KEY_NAME> \
    --security-groups checkpoint-api-sg \
    --region us-east-2 \
    --profile ml-sandbox \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":200,"VolumeType":"gp3"}}]' \
    --iam-instance-profile Name=ml-sandbox-ec2-role \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=checkpoint-api-server}]'
```

### Step 3: SSH and Setup

```bash
ssh -i ~/.ssh/<YOUR_KEY>.pem ubuntu@<PUBLIC_IP>

# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker

# Install nvidia-docker
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Copy api_server.py to instance
exit
scp -i ~/.ssh/<YOUR_KEY>.pem \
    /Users/nicholasbern/src/TTS-team/cluster/tts_image/api_server.py \
    ubuntu@<PUBLIC_IP>:~/api_server.py
ssh -i ~/.ssh/<YOUR_KEY>.pem ubuntu@<PUBLIC_IP>

# Login to ECR
aws ecr get-login-password --region us-east-2 | \
    sudo docker login --username AWS --password-stdin \
    211125460587.dkr.ecr.us-east-2.amazonaws.com

# Pull and run container
sudo docker pull 211125460587.dkr.ecr.us-east-2.amazonaws.com/cantina-tts/tts-team:1.2

sudo docker run -d \
    --name checkpoint-api \
    --gpus all \
    -p 8000:8000 \
    --restart unless-stopped \
    -v ~/api_server.py:/workspace/api_server.py \
    -e AWS_ACCESS_KEY_ID='<YOUR_ACCESS_KEY>' \
    -e AWS_SECRET_ACCESS_KEY='<YOUR_SECRET_KEY>' \
    -e AWS_SESSION_TOKEN='<YOUR_SESSION_TOKEN>' \
    -e AWS_REGION='us-east-1' \
    211125460587.dkr.ecr.us-east-2.amazonaws.com/cantina-tts/tts-team:1.2 \
    python /workspace/api_server.py

# Check logs
sudo docker logs -f checkpoint-api
```

## API Endpoints

### GET /health
Returns API status and available checkpoints.

```bash
curl http://<PUBLIC_IP>:8000/health
```

### POST /clone_speaker
Clone a voice from audio.

```bash
curl -X POST http://<PUBLIC_IP>:8000/clone_speaker \
    -H "Content-Type: application/json" \
    -d '{
        "wav_base64": "<base64-encoded-wav>",
        "checkpoint": "haitong"
    }'
```

Response:
```json
{
    "style_latent": [[float, float, ...]]
}
```

### POST /tts
Generate speech from text.

```bash
curl -X POST http://<PUBLIC_IP>:8000/tts \
    -H "Content-Type: application/json" \
    -d '{
        "text": "Hello, this is a test.",
        "style_latent": [[float, float, ...]],
        "checkpoint": "haitong",
        "temperature": 0.9,
        "top_p": 0.85,
        "top_k": 230
    }'
```

Response: Base64-encoded WAV audio

## Available Checkpoints

1. **haitong** - ParaLinguistic GRPO v1 (epoch 0, step 1200)
2. **zbigniew** - Simple GRPO v2 (epoch 0, step 450)
3. **julian** - DPO beta 0.1 (mTurk gradio bf16)

## Troubleshooting

### Container won't start
```bash
# Check logs
sudo docker logs checkpoint-api

# Check GPU
nvidia-smi

# Restart container
sudo docker restart checkpoint-api
```

### S3 Access Errors
Container needs AWS credentials. Either:
1. Use IAM role on instance (preferred)
2. Pass credentials via environment variables (shown above)

### Port 8000 not accessible
```bash
# Check security group
aws ec2 describe-security-groups \
    --group-names checkpoint-api-sg \
    --region us-east-2 \
    --profile ml-sandbox
```

### First request is slow
First request downloads models from S3 (~7-10GB). Subsequent requests are fast as models are cached in memory.

## Cost Management

g4dn.xlarge pricing:
- On-Demand: ~$0.526/hour (~$378/month if running 24/7)
- Spot: ~$0.16/hour (~$115/month)

**Stop instance when not in use:**
```bash
aws ec2 stop-instances \
    --instance-ids <INSTANCE_ID> \
    --region us-east-2 \
    --profile ml-sandbox
```

**Start instance:**
```bash
aws ec2 start-instances \
    --instance-ids <INSTANCE_ID> \
    --region us-east-2 \
    --profile ml-sandbox

# Get new public IP after restart
aws ec2 describe-instances \
    --instance-ids <INSTANCE_ID> \
    --region us-east-2 \
    --profile ml-sandbox \
    --query 'Reservations[0].Instances[0].PublicIpAddress'
```

## Files

- API Server: `/Users/nicholasbern/src/TTS-team/cluster/tts_image/api_server.py`
- Launch Script: `/Users/nicholasbern/src/TTS-team/cluster/tts_image/launch_checkpoint_api.sh`
- Client Service: `/Users/nicholasbern/src/ml-annotation/tts_side_by_side/server/app/services/checkpoint_service.py`
- Frontend: Pre-configured in YTTS provider
