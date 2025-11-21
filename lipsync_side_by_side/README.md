# Video Comparison Tool

A professional video comparison tool with synchronized playback, frame-by-frame scrubbing, speech-to-text transcription, and quality rating system.

## Features

- **Side-by-side video comparison** with synchronized playback
- **Frame-by-frame controls** with waveform visualization
- **Speech-to-text transcription** with word-level timestamps
- **Rating system** with issue tracking per video
- **Session persistence** - resume where you left off
- **Randomized comparisons** for unbiased evaluation
- **Apple-inspired UI** with clean, professional design
- **Results analytics** with model performance comparison

## Project Structure

```
├── server/                 # Flask backend
│   ├── app/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic (STT, video processing)
│   │   ├── models/        # Data models
│   │   └── utils/         # Helper functions
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment variables template
└── client/                # React frontend (Vite)
    ├── src/
    │   ├── components/    # React components
    │   ├── context/       # React context
    │   ├── hooks/         # Custom hooks
    │   └── styles/        # CSS styles
    ├── public/            # Static assets
    └── package.json       # Node dependencies
```

## Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- ffmpeg (for audio extraction)
- ElevenLabs API key

### Backend Setup

1. **Install Python dependencies:**
   ```bash
   cd server
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Install ffmpeg:**
   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   sudo apt-get install ffmpeg

   # Windows: Download from https://ffmpeg.org/download.html
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your ELEVENLABS_API_KEY
   ```

4. **Run the Flask server:**
   ```bash
   cd server
   python -m app.main
   # Server will run on http://localhost:8081
   ```

### Frontend Setup

1. **Install Node dependencies:**
   ```bash
   cd client
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   # Frontend will run on http://localhost:5174
   ```

3. **Build for production:**
   ```bash
   npm run build
   # Output will be in client/dist/
   ```

## API Endpoints

### Transcription

#### POST /api/transcribe
Transcribe a single video URL to text with word-level timestamps.

**Request:**
```json
{
  "video_url": "https://example.com/video.mp4",
  "language_code": "en"  // optional
}
```

**Response:**
```json
{
  "text": "Full transcript text",
  "words": [
    {
      "text": "word",
      "start": 0.0,
      "end": 0.5
    }
  ],
  "language_code": "en",
  "language_probability": 0.99
}
```

#### POST /api/transcribe/batch
Transcribe multiple videos in batch.

**Request:**
```json
{
  "videos": [
    {"url": "https://example.com/video1.mp4", "id": "video1"},
    {"url": "https://example.com/video2.mp4", "id": "video2"}
  ],
  "language_code": "en"  // optional
}
```

### Health Check

#### GET /health
Check if the API is running.

## Configuration File Format

Upload a JSON file with video pairs:

```json
{
  "video_pairs": [
    {
      "model_1": "https://example.com/video1_modelA.mp4",
      "model_2": "https://example.com/video1_modelB.mp4"
    },
    {
      "model_1": "https://example.com/video2_modelA.mp4",
      "model_2": "https://example.com/video2_modelB.mp4"
    }
  ]
}
```

## Development

### Running in Development Mode

1. Start the Flask backend:
   ```bash
   cd server
   FLASK_ENV=development python -m app.main
   ```

2. Start the React dev server:
   ```bash
   cd client
   npm run dev
   ```

The React dev server will proxy API requests to the Flask backend.

### Vercel Deployment

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. From the `v3` directory, deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `ELEVENLABS_API_KEY` - For transcription API

The app will automatically:
- Build the React frontend
- Deploy Python serverless functions for the backend
- Serve the app at your Vercel URL

### Traditional Production Deployment

1. Build the React app:
   ```bash
   cd client
   npm run build
   ```

2. Run the Flask server:
   ```bash
   cd server
   python -m app.main
   ```

Flask will serve the built React app and API endpoints.

## Features in Detail

### Video Playback
- Synchronized playback of two videos
- Frame-by-frame stepping (⏮/⏭ buttons)
- Waveform visualization on timeline
- Draggable timeline scrubber

### Rating System
- 1-5 star rating for each video
- Multi-select issue tracking per video
- Automatic preference suggestion based on ratings
- Manual preference override

### Transcription
- Automatic speech-to-text using ElevenLabs
- Word-level timestamps
- Synchronized display with video playback
- Support for multiple languages

### Results Analytics
- Model-by-model performance comparison
- Preference distribution visualization
- Common issues breakdown
- Export capabilities

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)
