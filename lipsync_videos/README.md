# Lipsync Video Annotator

A modern TypeScript + React application for annotating lipsync videos with automatic S3 persistence.

## Features

- 🎥 **Video Playback**: Synchronized video player with frame-by-frame controls
- 📝 **Annotation Interface**: Simple, intuitive annotation workflow
- ☁️ **S3 Integration**: Automatically saves annotations to AWS S3
- 🎨 **Modern UI**: Clean, Apple-inspired design
- 📱 **Responsive**: Works on desktop and tablet
- 🔧 **TypeScript**: Fully typed for better DX
- 🚀 **Fast**: Built with Vite

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **AWS S3** - Cloud storage
- **Vercel** - Deployment platform

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI (Button, Card, ProgressBar)
│   ├── video/          # Video components (Player, Controls, Transcript)
│   └── AnnotationView.tsx
├── config/             # Configuration and constants
├── hooks/              # Custom React hooks (useVideoSync, useWaveform)
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── App.tsx             # Main app component
└── main.tsx            # App entry point

api/
└── save-annotations.ts # Vercel serverless function for S3
```

## Getting Started

### Prerequisites

- Node.js 18+
- AWS credentials (temporary or permanent)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
# Visit http://localhost:5173
```

### Building

```bash
npm run build
npm run preview
```

## Usage

1. Launch the application
2. Upload a JSON configuration file with your videos
3. Annotate each video with rating (0-10) and notes
4. Click "Next" - annotations automatically save to S3
5. Progress through all videos

### JSON Configuration Format

```json
[
  {
    "video_name": "video1",
    "models": {
      "ground-truth": "https://example.com/video1-gt.mp4",
      "model-a": "https://example.com/video1-a.mp4"
    }
  }
]
```

## S3 Configuration

### Environment Variables

**Location**: `.env` file in parent directory (`/Users/nicholasbern/src/ml-annotation/.env`)

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SESSION_TOKEN=your_session_token  # For temporary credentials
AWS_REGION=us-east-1
AWS_BUCKET_NAME=cantina-testsets
```

### S3 File Location

Annotations save to: `s3://cantina-testsets/LIPSYNC_V1/final_meta_ui.csv`

The S3 path is hardcoded in:
- `src/config/constants.ts` → `S3_CONFIG`
- `api/constants.ts` → `S3_CONFIG`

To change the S3 path, edit these files.

### CSV Format

Saved annotations contain:
- `path` - Video URL
- `video_name` - Human-readable name
- `rating` - Quality rating (0-10)
- `notes` - Annotation notes
- `timestamp` - Unix timestamp
- `last_updated` - Date (YYYY-MM-DD)

### How S3 Integration Works

1. User clicks "Next" after annotating
2. API fetches existing CSV from S3
3. API merges new annotation with existing data
4. API uploads updated CSV to S3
5. User gets success/error feedback

## Deployment to Vercel

### Quick Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables

Add these in Vercel dashboard (Project Settings → Environment Variables):

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` (if using temporary credentials)
- `AWS_REGION`
- `AWS_BUCKET_NAME`

**Note**: `S3_CSV_KEY` is not needed - it's hardcoded in the app.

### GitHub Integration

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Auto-deploy on push

## AWS Credentials

### Temporary Credentials (Session Tokens)

The provided credentials use session tokens that **expire after ~12 hours**.

When they expire:
1. Generate new credentials from AWS Console
2. Update parent `.env` file
3. Update Vercel environment variables
4. Redeploy

### Long-term Solution

For production:
- Create dedicated IAM user with S3-only permissions
- Use permanent credentials (no session token)
- Or use Vercel's AWS integration with IAM roles

### Required IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::cantina-testsets/LIPSYNC_V1/*"
    }
  ]
}
```

## Troubleshooting

### "Failed to save annotation"
- Check AWS credentials are valid
- Verify credentials haven't expired
- Check S3 bucket permissions
- Look at browser console for details

### "NoSuchKey" error
- Normal on first run (CSV doesn't exist yet)
- API will create it automatically

### CORS errors
- Use `npm run dev` locally
- Vercel handles CORS automatically in production

### Session expired
- Generate new credentials from AWS Console
- Update `.env` and Vercel variables

## Architecture Highlights

- **Component-Based**: Modular, reusable components
- **Custom Hooks**: Encapsulated logic (video sync, waveform generation)
- **Type-Safe**: Full TypeScript coverage
- **Serverless API**: Vercel function handles S3 operations
- **Modern Build**: Vite for fast dev and optimized production builds

## Customization

### Changing S3 Path

Edit both files:

**`src/config/constants.ts`**:
```typescript
export const S3_CONFIG = {
  CSV_KEY: 'YOUR_PATH/file.csv',
  BUCKET_NAME: 'your-bucket',
  REGION: 'us-east-1',
} as const;
```

**`api/constants.ts`**:
```typescript
export const S3_CONFIG = {
  CSV_KEY: 'YOUR_PATH/file.csv',
} as const;
```

### Adding Annotation Fields

1. Update types in `src/types/annotation.ts`
2. Add UI controls in `src/components/AnnotationView.tsx`
3. Update save logic in annotation handler

## License

MIT

## Contributing

PRs welcome! Please maintain TypeScript types and follow existing code style.
