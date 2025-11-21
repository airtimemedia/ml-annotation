# Quick Start Guide

Get up and running with TTS Side by Side in 5 minutes!

## Step 1: Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your ElevenLabs API key
# ELEVENLABS_API_KEY=your_actual_key_here
```

## Step 2: Install Dependencies

```bash
# Backend (Python)
cd server
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r ../api/requirements.txt
cd ..

# Frontend (Node)
cd client
npm install
cd ..
```

## Step 3: Run the App

Open two terminal windows:

**Terminal 1 - Backend:**

```bash
cd server
source .venv/bin/activate  # Windows: .venv\Scripts\activate
python app/main.py
```

**Terminal 2 - Frontend:**

```bash
cd client
npm run dev
```

## Step 4: Use the App

1. Open http://localhost:5173
2. Upload a reference audio file (WAV, MP3, etc.)
3. Click "Clone Voice" and wait for processing
4. Enter text to synthesize
5. Click "Generate Audio"
6. Listen to the results side by side!

## Troubleshooting

**Backend not starting?**

- Check that `.env` file exists with `ELEVENLABS_API_KEY`
- Verify Python virtual environment is activated
- Make sure port 5002 is not in use

**Frontend not starting?**

- Run `npm install` again in the `client/` directory
- Check that port 5173 is not in use
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

**Voice cloning fails?**

- Verify your ElevenLabs API key is valid
- Check you have sufficient API credits
- Ensure audio file is in a supported format

## Next Steps

- Read the full [README.md](./README.md) for deployment instructions
- Add your own TTS service to compare against ElevenLabs
- Customize the UI in `client/src/App.css`

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variable in Vercel dashboard
# Project Settings → Environment Variables → Add ELEVENLABS_API_KEY

# Deploy to production
vercel --prod
```

Done! 🎉
