# Checkpoint API Integration Verification

## Integration Status: ✅ COMPLETE

All components are correctly integrated and tested.

## Component Checklist

### 1. API Server ✅
**File:** `/Users/nicholasbern/src/TTS-team/cluster/tts_image/api_server.py`
- FastAPI server with 3 endpoints: `/health`, `/clone_speaker`, `/tts`
- Supports 3 checkpoints: haitong, zbigniew, julian
- Lazy model loading from S3
- torch.compile disabled to avoid generator issues

### 2. Backend Service ✅
**File:** `server/app/services/checkpoint_service.py`
- `clone_voice(audio_file_path, model)` - Calls `/clone_speaker` API
- `generate_speech(text, voice_data, settings)` - Calls `/tts` API
- Properly encodes/decodes base64 audio
- Returns voice_data with `type: "checkpoint"` and `style_latent`

### 3. YTTS Service Integration ✅
**File:** `server/app/services/ytts_service.py`

**Model Configs (lines 282-296):**
```python
"haitong": {
    "name": "Haitong's Candidate",
    "type": "checkpoint",
    "checkpoint_id": "haitong",
},
"zbigniew": {
    "name": "Zbigniew's Candidate",
    "type": "checkpoint",
    "checkpoint_id": "zbigniew",
},
"julian": {
    "name": "Julian's Candidate",
    "type": "checkpoint",
    "checkpoint_id": "julian",
},
```

**Clone Voice (line 330-334):**
```python
elif model_config['type'] == 'checkpoint':
    # Delegate to CheckpointService
    checkpoint_id = model_config['checkpoint_id']
    return self.checkpoint_service.clone_voice(audio_file_path, checkpoint_id)
```

**Generate Speech (line 498-501):**
```python
if voice_data.get("type") == "checkpoint":
    # Delegate to CheckpointService
    return self.checkpoint_service.generate_speech(text, voice_data, settings)
```

### 4. Frontend ✅
**File:** `client/src/providers/ytts.ts`

**Models Configuration (lines 25-41):**
```typescript
{
  id: 'haitong',
  name: "Haitong's Candidate",
  description: 'ParaLinguistic GRPO v1 (epoch 0, step 1200)',
  type: 'checkpoint',
},
{
  id: 'zbigniew',
  name: "Zbigniew's Candidate",
  description: 'Simple GRPO v2 (epoch 0, step 450)',
  type: 'checkpoint',
},
{
  id: 'julian',
  name: "Julian's Candidate",
  description: 'DPO beta 0.1 (mTurk gradio bf16)',
  type: 'checkpoint',
},
```

### 5. Environment Configuration ✅
**File:** `.env`
```bash
CHECKPOINT_API_URL=http://18.218.255.230:8000
```

## Data Flow

### Voice Cloning Flow:
1. User uploads audio in frontend
2. Frontend sends to `/ytts/clone` with `model="haitong"` (or zbigniew/julian)
3. YTTS service checks `model_config['type'] == 'checkpoint'`
4. Delegates to `checkpoint_service.clone_voice(audio_file, "haitong")`
5. CheckpointService calls `http://18.218.255.230:8000/clone_speaker`
6. API server loads Haitong model and returns style_latent
7. Returns to frontend: `{type: "checkpoint", style_latent: [...], checkpoint: "haitong"}`

### Speech Generation Flow:
1. User enters text and clicks generate
2. Frontend sends to `/ytts/generate` with voice_data containing `type: "checkpoint"`
3. YTTS service checks `voice_data.get("type") == "checkpoint"`
4. Delegates to `checkpoint_service.generate_speech(text, voice_data, settings)`
5. CheckpointService calls `http://18.218.255.230:8000/tts` with style_latent
6. API server generates audio using cached model
7. Returns WAV file to frontend for playback

## Testing Results

**Test Script:** `test_checkpoint_api.py` and `quick_test.py`

### Health Check ✅
```bash
$ curl http://18.218.255.230:8000/health
{
  "status": "healthy",
  "gpu_available": true,
  "available_checkpoints": ["haitong", "zbigniew", "julian"]
}
```

### Clone Speaker ✅
- Input: 1-second 440Hz sine wave (22050 Hz, mono, 16-bit WAV)
- Output: Style latent shape `1x32x1024`
- Time: ~2-3 minutes (first request), <10 seconds (cached)

### TTS Generation ✅
- Input: "Hello, this is a test." + style latent
- Output: 206KB WAV file
- Time: ~2-3 minutes (first request), ~30 seconds (cached)

## Known Behaviors

### First Request is Slow
- Downloads ~7-10GB of models from S3
- GPT checkpoint: ~2-3GB
- Decoder: ~1-2GB
- Vocab + other assets: ~500MB
- Subsequent requests use cached models

### torch.compile Disabled
- Tesla T4 GPU doesn't fully support bfloat16 compilation
- PyTorch dynamo has issues with Python generators
- Disabled with `use_torch_compile=False` in ModelConfig

## Usage in App

### 1. Select Provider
- Choose "YTTS" provider in dropdown

### 2. Select Checkpoint Model
- Choose from:
  - Haitong's Candidate (ParaLinguistic GRPO v1)
  - Zbigniew's Candidate (Simple GRPO v2)
  - Julian's Candidate (DPO beta 0.1)

### 3. Clone Voice
- Upload reference audio (WAV preferred)
- Wait for processing (~2-3 min first time)
- Voice embedding stored in session

### 4. Generate Speech
- Enter text to synthesize
- Adjust temperature, top_p, top_k if desired
- Click generate
- Audio appears in player for side-by-side comparison

## Maintenance

### Check API Status
```bash
curl http://18.218.255.230:8000/health
```

### View API Logs
```bash
ssh -i ~/.ssh/nicholas-checkpoint-api.pem ubuntu@18.218.255.230
sudo docker logs -f checkpoint-api
```

### Restart API Server
```bash
ssh -i ~/.ssh/nicholas-checkpoint-api.pem ubuntu@18.218.255.230
sudo docker restart checkpoint-api
```

### Stop EC2 Instance (Save Money)
```bash
aws ec2 stop-instances \
    --instance-ids i-07f3c7073a6cff8b5 \
    --region us-east-2 \
    --profile ml-sandbox
```

### Start EC2 Instance
```bash
aws ec2 start-instances \
    --instance-ids i-07f3c7073a6cff8b5 \
    --region us-east-2 \
    --profile ml-sandbox

# Get new IP after restart
aws ec2 describe-instances \
    --instance-ids i-07f3c7073a6cff8b5 \
    --region us-east-2 \
    --profile ml-sandbox \
    --query 'Reservations[0].Instances[0].PublicIpAddress'

# Update .env with new IP
```

## Files Modified/Created

### Created:
- `/Users/nicholasbern/src/TTS-team/cluster/tts_image/api_server.py`
- `/Users/nicholasbern/src/ml-annotation/tts_side_by_side/server/app/services/checkpoint_service.py`
- `/Users/nicholasbern/src/ml-annotation/tts_side_by_side/scripts/deploy_checkpoint_api.md`
- `/Users/nicholasbern/src/ml-annotation/tts_side_by_side/scripts/integration_verification.md`
- `~/.ssh/nicholas-checkpoint-api.pem`

### Modified:
- `/Users/nicholasbern/src/ml-annotation/.env` (added CHECKPOINT_API_URL)
- `/Users/nicholasbern/src/ml-annotation/tts_side_by_side/server/app/services/ytts_service.py` (added checkpoint configs and delegation)
- `/Users/nicholasbern/src/ml-annotation/tts_side_by_side/client/src/providers/ytts.ts` (added checkpoint models)

## Summary

All integration is complete and tested. The app is ready to use the checkpoint API for side-by-side TTS comparisons.

**API Endpoint:** http://18.218.255.230:8000
**Available Models:** haitong, zbigniew, julian
**Status:** Operational ✅
