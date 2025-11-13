# Deployment Guide - Video Annotation Tool

## Deploying to Vercel

### Prerequisites
- Vercel account
- Git repository with the code

### Method 1: Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to project directory
cd lipsync_videos

# Deploy
vercel

# Or deploy to production directly
vercel --prod
```

### Method 2: GitHub Integration

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add video annotation tool"
   git push
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository
   - Select the `lipsync_videos` directory as the root

3. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `lipsync_videos`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

4. **Deploy**: Click "Deploy"

### Configuration Files

The project includes:
- ✅ `vercel.json` - Vercel configuration with SPA rewrites
- ✅ `public/_redirects` - Fallback for SPA routing
- ✅ `.vercelignore` - Files to exclude from deployment

### Data Files

Before deploying, ensure these files are in `public/`:

1. **`public/video_list.json`** - Your video list:
   ```json
   [
     {
       "url": "https://example.com/video1.mp4",
       "path": "videos/video1.mp4"
     }
   ]
   ```

2. **`public/final_meta.csv`** (optional) - Existing annotations:
   ```csv
   path,source,content_type,direction,size,include,category,notes,last_updated
   videos/video1.mp4,real,human,straight,medium,include,simple,Sample note,2025-11-07
   ```

### Post-Deployment

After deployment:

1. **Test the URL**: Visit your Vercel deployment URL
2. **Verify data loading**: Check that video_list.json loads
3. **Test annotation flow**: Annotate a video and export CSV
4. **Check console**: Look for any errors in browser console

### Custom Domain (Optional)

1. Go to your project in Vercel
2. Navigate to "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Updating Data Files

### Option 1: Redeploy
Update files in `public/` and redeploy:
```bash
# Update public/video_list.json
# Update public/final_meta.csv (optional)
vercel --prod
```

### Option 2: API Integration (Future)
For dynamic updates without redeployment:
- Store `video_list.json` in S3/database
- Create API endpoint to fetch videos
- Load CSV from cloud storage

## Environment Variables

No environment variables are currently needed for the video annotation tool (it runs entirely client-side with CSV export).

If you add server-side features (e.g., S3 integration), add them in:
- **Vercel Dashboard**: Project Settings → Environment Variables

## Troubleshooting

### 404 on page routes
- ✅ Already configured: `vercel.json` has SPA rewrites
- ✅ Already included: `public/_redirects` as fallback

### Videos not loading
- Check `public/video_list.json` is deployed
- Verify video URLs are accessible (CORS configured)
- Check browser console for CORS errors

### CSV not exporting
- Ensure browser allows downloads
- Check browser console for errors
- Verify annotations are being saved to state

### Build fails
```bash
# Test build locally first
npm run build

# Check for TypeScript errors
npm run build 2>&1 | grep error
```

### Vercel deployment errors
- Check build logs in Vercel dashboard
- Ensure `lipsync_videos` is set as root directory
- Verify `node_modules` is gitignored

## Performance Tips

1. **Video hosting**: Host videos on CDN (CloudFront, Cloudflare)
2. **Optimize videos**: Use compressed formats (H.264)
3. **Lazy loading**: Videos load on-demand (already implemented)
4. **Caching**: Vercel automatically caches static assets

## Security Notes

- Tool runs client-side (no server state)
- CSV exports download to user's machine
- No authentication needed (add if required)
- Consider adding basic auth for private deployments

## Monitoring

- **Vercel Analytics**: Enable in project settings
- **Error Tracking**: Add Sentry integration if needed
- **Performance**: Use Vercel Speed Insights

## Cost

- **Vercel Free Tier**: Sufficient for this app
- **Bandwidth**: Watch if serving large videos
- **Build Time**: Fast builds (~30-60 seconds)

## Support

For issues:
1. Check Vercel deployment logs
2. Review browser console errors
3. Test locally with `npm run dev`
4. Check Vercel system status
