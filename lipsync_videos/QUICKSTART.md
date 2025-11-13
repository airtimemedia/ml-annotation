# Video Annotation Tool - Quick Start

## ✅ Ready for Vercel Deployment!

This React-based video annotation tool is fully configured to run on Vercel with S3 integration.

## What's Included

### Frontend (React + TypeScript)
- ✅ Video player with controls
- ✅ Annotation panel with all fields
- ✅ Real-time statistics
- ✅ Progress tracking
- ✅ Keyboard shortcuts (Arrow keys, Spacebar)
- ✅ Responsive design

### Backend (Vercel Serverless Functions)
- ✅ `/api/fetch-csv` - Loads video list and annotations from S3
- ✅ `/api/save-annotations` - Auto-saves annotations to S3
- ✅ Configured with AWS SDK for S3 operations

### Configuration
- ✅ `vercel.json` - Deployment configuration
- ✅ `.vercelignore` - Excludes unnecessary files
- ✅ `public/_redirects` - SPA routing fallback
- ✅ `.env.example` - Environment variable template

## Deploy to Vercel

### Option 1: Vercel CLI (Fastest)

```bash
cd lipsync_videos
npm install -g vercel
vercel
```

Then add environment variables in Vercel dashboard.

### Option 2: GitHub + Vercel (Recommended)

1. **Push to GitHub**
2. **Import to Vercel**
   - Set **Root Directory** to `lipsync_videos`
3. **Add Environment Variables**:
   ```
   AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY
   AWS_SESSION_TOKEN  # if using temporary credentials
   AWS_REGION=us-east-1
   AWS_BUCKET_NAME=cantina-testsets
   ```
4. **Deploy**

## Environment Variables

Required in Vercel (Project Settings → Environment Variables):

| Variable | Value |
|----------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `AWS_SESSION_TOKEN` | Temporary session token (optional) |
| `AWS_REGION` | `us-east-1` |
| `AWS_BUCKET_NAME` | `cantina-testsets` |

## How It Works

1. **On Load**: App fetches CSV from `s3://cantina-testsets/LIPSYNC_V1/final_meta_ui.csv`
2. **Video List**: Extracts from CSV `path` column (S3 URLs)
3. **Annotations**: Loads existing data from CSV
4. **Auto-Save**: Each annotation saves to S3 immediately
5. **Export**: Download all annotations as CSV

## S3 File Structure

```
s3://cantina-testsets/
└── LIPSYNC_V1/
    └── final_meta_ui.csv  # Video list + annotations
```

CSV Format:
```csv
path,source,content_type,direction,size,include,category,notes,last_updated
https://s3.../video1.mp4,real,human,straight,medium,include,simple,Note,2025-11-07
```

## Local Development

```bash
cd lipsync_videos
npm install
npm run dev  # Runs on http://localhost:5176
```

**Note**: Local development requires AWS credentials in parent `.env` file:
```bash
# /Users/nicholasbern/src/ml-annotation/.env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=...
AWS_REGION=us-east-1
AWS_BUCKET_NAME=cantina-testsets
```

## Testing Deployment

After deploying:

1. Visit your Vercel URL
2. Check that videos load (should see video list from S3)
3. Annotate a video
4. Check browser console for "Annotation saved to S3"
5. Verify S3 CSV was updated

## Architecture

```
User → React App → Vercel Functions → AWS S3
         ↓              ↓                ↓
    [Local State] [fetch-csv]    [final_meta_ui.csv]
    [Statistics]  [save-annotations]
```

## Features

- **Auto-save**: Annotations save to S3 as you work
- **Offline Tolerance**: Annotations saved locally if S3 fails
- **Real-time Stats**: Progress tracking without page refresh
- **Keyboard Shortcuts**: Navigate with arrow keys
- **Jump Navigation**: Jump to any video by number
- **Export CSV**: Download all annotations locally

## Files Overview

```
lipsync_videos/
├── src/
│   ├── components/      # UI components
│   ├── hooks/           # Custom hooks (data loading, stats)
│   ├── utils/           # CSV parsing
│   ├── types/           # TypeScript types
│   └── App.tsx          # Main app
├── api/
│   ├── fetch-csv.ts     # GET CSV from S3
│   └── save-annotations.ts  # POST annotations to S3
├── public/
│   └── _redirects       # SPA routing
├── vercel.json          # Vercel config
├── .env.example         # Env template
└── VERCEL_SETUP.md      # Detailed setup guide
```

## Troubleshooting

### "Failed to fetch CSV from S3"
- Check AWS credentials in Vercel
- Verify S3 file exists at `LIPSYNC_V1/final_meta_ui.csv`
- Check IAM permissions (needs `s3:GetObject`, `s3:PutObject`)

### Build Errors
- Ensure **Root Directory** is set to `lipsync_videos` in Vercel
- Check build logs in Vercel dashboard

### Session Token Expiration
- Temporary credentials expire after ~12 hours
- Update environment variables in Vercel
- Redeploy

## Documentation

- `VERCEL_SETUP.md` - Detailed deployment guide
- `README_VIDEO_CURATION.md` - Full project documentation
- `DEPLOYMENT.md` - General deployment info

## Support

The app is production-ready with:
- ✅ TypeScript for type safety
- ✅ Error handling
- ✅ Auto-save to S3
- ✅ Responsive design
- ✅ Best React practices
- ✅ Vercel optimized

Deploy and start annotating! 🚀
