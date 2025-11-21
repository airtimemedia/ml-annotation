# TTS Side by Side

A web application for comparing text-to-speech (TTS) models with voice cloning capabilities. Built with Flask (Python) backend and React (Vite) frontend, designed to run on Vercel.

## Features

- **Voice Cloning**: Upload reference audio to clone voices using ElevenLabs
- **Text-to-Speech Generation**: Generate speech from text using cloned voices
- **Side-by-Side Comparison**: Compare audio output from multiple TTS services
- **Clean UI**: Modern, responsive interface inspired by Apple's design language
- **Easy Integration**: Placeholder for adding additional TTS APIs alongside ElevenLabs

## Project Structure

```
tts_side_by_side/
├── api/
│   ├── index.py              # Vercel serverless function entry point
│   └── requirements.txt      # Python dependencies
├── server/
│   └── app/
│       ├── main.py           # Flask app initialization
│       ├── constants.py      # Configuration constants
│       ├── routes/
│       │   ├── main.py       # Health check endpoints
│       │   └── tts.py        # TTS API endpoints
│       ├── services/
│       │   ├── app.py        # Flask app factory
│       │   └── elevenlabs_service.py  # ElevenLabs integration
│       └── utils/
│           └── audio_utils.py  # Audio validation utilities
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudioUpload.jsx      # Audio file upload component
│   │   │   ├── TextInput.jsx        # Text input for TTS
│   │   │   ├── ComparisonView.jsx   # Side-by-side audio comparison
│   │   │   └── components.css       # Component styles
│   │   ├── App.jsx           # Main app component
│   │   ├── App.css           # Global styles
│   │   ├── main.jsx          # React entry point
│   │   └── index.css         # Base styles
│   ├── package.json          # Node dependencies
│   ├── vite.config.js        # Vite configuration
│   └── index.html            # HTML template
└── vercel.json               # Vercel deployment config
```

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- ElevenLabs API key

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Optional
FLASK_ENV=development
SECRET_KEY=your-secret-key
PORT=5002
```

### Local Development

#### 1. Install Backend Dependencies

```bash
cd server
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r ../api/requirements.txt
```

#### 2. Install Frontend Dependencies

```bash
cd client
npm install
```

#### 3. Run Development Servers

**Terminal 1 - Backend:**

```bash
cd server
source .venv/bin/activate  # If not already activated
python app/main.py
```

The Flask server will run on `http://localhost:5002`

**Terminal 2 - Frontend:**

```bash
cd client
npm run dev
```

The Vite dev server will run on `http://localhost:5173`

#### 4. Open the App

Navigate to `http://localhost:5173` in your browser.

## Deploying to Vercel

### Prerequisites

- Vercel account
- Vercel CLI (optional): `npm i -g vercel`

### Deployment Steps

1. **Connect to Vercel**

   ```bash
   vercel
   ```

2. **Set Environment Variables**
   In Vercel dashboard:

   - Go to Project Settings → Environment Variables
   - Add `ELEVENLABS_API_KEY` with your API key

3. **Deploy**

   ```bash
   vercel --prod
   ```

   Or push to your connected Git repository (GitHub, GitLab, Bitbucket) to trigger automatic deployment.

### Vercel Configuration

The `vercel.json` file configures:

- Build command for React frontend
- Serverless function settings for Python backend
- API routing and rewrites
- Function timeout (300s) and memory (3008MB)

## API Endpoints

### Health Check

```
GET /api/health
```

Returns server health status.

### Clone Voice

```
POST /api/tts/clone-voice
Content-Type: multipart/form-data

Body: { audio: <audio file> }
```

Uploads audio and clones voice with ElevenLabs.

**Response:**

```json
{
  "success": true,
  "message": "Voice cloned successfully",
  "voices": {
    "elevenlabs": {
      "voice_id": "...",
      "status": "ready"
    },
    "other_api": {
      "voice_id": null,
      "status": "pending"
    }
  }
}
```

### Generate TTS

```
POST /api/tts/generate
Content-Type: application/json

Body: {
  "text": "Text to synthesize",
  "voices": { ... },
  "elevenlabs_settings": {
    "model": "eleven_turbo_v2",
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.0,
    "use_speaker_boost": true,
    "speed": 1.0
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Audio generated successfully",
  "audio": {
    "elevenlabs": {
      "path": "/tmp/audio_xxx.mp3",
      "status": "ready"
    },
    "other_api": {
      "path": null,
      "status": "pending"
    }
  }
}
```

### Serve Audio

```
GET /api/tts/audio/<filename>
```

Returns generated audio file.

## Adding Additional TTS Services

To integrate another TTS service alongside ElevenLabs:

### 1. Create Service Module

Create `server/app/services/your_service.py`:

```python
class YourTTSService:
    def __init__(self):
        self.api_key = os.environ.get("YOUR_API_KEY")

    def clone_voice(self, audio_path: str) -> str:
        # Implement voice cloning
        return voice_id

    def generate_speech(self, text: str, voice_id: str, settings: dict) -> str:
        # Implement TTS generation
        return audio_file_path
```

### 2. Update TTS Routes

In `server/app/routes/tts.py`:

```python
from app.services.your_service import YourTTSService

your_service = YourTTSService()

# In clone_voice():
your_voice_id = your_service.clone_voice(temp_path)

# In generate_tts():
your_audio_path = your_service.generate_speech(text, voice_id, settings)
```

### 3. Update Frontend

The UI is already set up to display two services side by side. Once the backend returns data for `other_api`, it will automatically display in the comparison view.

## Configuration

### Audio Settings

Edit `server/app/constants.py`:

```python
# Allowed audio file formats
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac", ".ogg"}

# Max audio duration in seconds
MAX_AUDIO_DURATION_SECONDS = 60

# Max file upload size (in bytes)
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB
```

### ElevenLabs Settings

Default settings in `server/app/services/elevenlabs_service.py`:

```python
default_settings = {
    "stability": 0.5,           # 0.0 - 1.0
    "similarity_boost": 0.75,   # 0.0 - 1.0
    "style": 0.0,               # 0.0 - 1.0
    "use_speaker_boost": True,  # True/False
    "speed": 1.0                # 0.5 - 2.0
}
```

## Troubleshooting

### Common Issues

**Issue: "ELEVENLABS_API_KEY environment variable not set"**

- Solution: Make sure `.env` file exists with `ELEVENLABS_API_KEY=your_key`

**Issue: Audio not playing**

- Check browser console for errors
- Verify audio file was generated (check Flask logs)
- Ensure audio file path is accessible

**Issue: Voice cloning fails**

- Verify audio file format is supported
- Check audio file is not corrupted
- Review ElevenLabs API limits and quota

**Issue: Vercel deployment timeout**

- Large audio files may exceed serverless function timeout
- Consider increasing timeout in `vercel.json` (max 300s on Pro plan)
- Or use external storage (S3) for audio processing

## Development Tips

### Hot Reload

- Frontend hot reloads automatically with Vite
- Backend requires manual restart when Python files change
- Consider using `flask run --debug` for auto-reload

### Testing API Endpoints

Use curl or Postman to test endpoints:

```bash
# Health check
curl http://localhost:5002/api/health

# Clone voice
curl -X POST http://localhost:5002/api/tts/clone-voice \
  -F "audio=@path/to/your/audio.wav"
```

### Browser DevTools

- Open Network tab to inspect API requests/responses
- Check Console for JavaScript errors
- Use React DevTools extension for component debugging

## License

This project is part of the ml-annotation toolkit.

## Credits

- Based on the architecture of `lipsync_side_by_side`
- Inspired by the Gradio script `gradio_cloning_kece_vs_11labs.py`
- UI design inspired by Apple's design language
