# Intent Annotation Tool

A web application for annotating intent data with multi-user support and automatic syncing to Hugging Face.

## Architecture

- **Frontend**: React + TypeScript + Vite (in `client/`)
- **Backend**: Flask Python API (in `server/`)
- **Data Storage**: Hugging Face Datasets
- **Deployment**: Vercel (serverless functions)

## Local Development

1. Install dependencies:
```bash
# Install Python dependencies
pip3 install -r api/requirements.txt

# Install Node dependencies
cd client && npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your HUGGINGFACE_TOKEN
```

**Option B: Separate servers (for hot reload)**
```bash
# Terminal 1: Flask API
cd server && python3 -m app.main

# Terminal 2: Vite dev server
cd client && npm run dev
```

## Deployment to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
- `HUGGINGFACE_TOKEN`: Your Hugging Face API token
- `SECRET_KEY`: Random secret key for Flask sessions

## Features

- ✅ Load datasets from Hugging Face
- ✅ Edit and annotate rows
- ✅ Unsaved changes warning
- ✅ Auto-save to Hugging Face on navigation
- ✅ Background dataset refresh
- ✅ Multi-user support (last write wins)
- ✅ Commit messages with changed row names

## API Endpoints

### `GET /api/load-intent-data?refresh=true`
Load dataset from cache or force refresh from Hugging Face.

### `POST /api/save-intent-annotations`
Save a single annotation and push to Hugging Face immediately.

```json
{
  "annotation": {
    "prompt_name": "example_prompt",
    "new_room_unified_format_input": "...",
    "unified_format_output_enriched_fixed": "...",
    "reviewed": true,
    "timestamp": 1234567890,
    "last_updated": "2025-01-01T00:00:00Z"
  }
}
```
