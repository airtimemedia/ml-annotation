# Vercel Deployment Setup

## Quick Deploy

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Deploy from lipsync_videos directory
```bash
cd lipsync_videos
vercel
```

### 3. Add Environment Variables

In Vercel dashboard (Project Settings → Environment Variables), add:

```
AWS_ACCESS_KEY_ID=<your_key>
AWS_SECRET_ACCESS_KEY=<your_secret>
AWS_SESSION_TOKEN=<your_token>  # If using temporary credentials
AWS_REGION=us-east-1
AWS_BUCKET_NAME=cantina-testsets
```

### 4. Redeploy
```bash
vercel --prod
```

## GitHub Integration (Recommended)

### 1. Push to GitHub
```bash
git add .
git commit -m "Add video annotation tool"
git push
```

### 2. Connect to Vercel
- Go to https://vercel.com
- Click "New Project"
- Import your repository
- **Important**: Set root directory to `lipsync_videos`

### 3. Configure Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `lipsync_videos` ⚠️ **Required!**
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `dist` (auto-detected)

### 4. Add Environment Variables
Same as above - add all AWS credentials

### 5. Deploy
Click "Deploy" - future pushes will auto-deploy

## Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_SESSION_TOKEN` | Temporary session token | `IQoJb3JpZ2luX2VjE...` (optional) |
| `AWS_REGION` | S3 bucket region | `us-east-1` |
| `AWS_BUCKET_NAME` | S3 bucket name | `cantina-testsets` |

## S3 Configuration

The app uses this S3 path (hardcoded):
```
s3://cantina-testsets/LIPSYNC_V1/final_meta_ui.csv
```

To change the path, edit:
- `api/fetch-csv.ts` → Line 32: `const csvKey = 'YOUR_PATH/file.csv';`
- `api/save-annotations.ts` → Line 47: `const csvKey = 'YOUR_PATH/file.csv';`

## Verification

After deployment:

1. **Check Build Logs**: Look for any errors
2. **Test API Endpoints**:
   - Visit `https://your-app.vercel.app/api/fetch-csv`
   - Should return CSV data from S3
3. **Test UI**:
   - Visit `https://your-app.vercel.app`
   - Videos should load from S3 CSV
4. **Test Annotations**:
   - Annotate a video
   - Check browser console for "Annotation saved to S3"
   - Verify S3 CSV was updated

## Troubleshooting

### Build Errors

**"Cannot find module '@aws-sdk/client-s3'"**
- ✅ Already added to package.json
- Vercel should install automatically

**"Root directory not found"**
- Set root directory to `lipsync_videos` in Vercel project settings

### Runtime Errors

**"Failed to fetch CSV from S3"**
- Check AWS credentials are added in Vercel
- Verify credentials haven't expired (session tokens expire)
- Check S3 bucket name is correct
- Ensure S3 file exists at `LIPSYNC_V1/final_meta_ui.csv`

**"Access Denied"**
- Check IAM permissions for the credentials
- Required permissions: `s3:GetObject`, `s3:PutObject` on the bucket

**CORS Errors**
- Vercel handles CORS automatically via `vercel.json`
- Check `vercel.json` has proper rewrites

### Session Token Expiration

Temporary credentials (with `AWS_SESSION_TOKEN`) expire after ~12 hours.

**To fix**:
1. Generate new credentials from AWS Console
2. Update Vercel environment variables
3. Trigger new deployment (push to GitHub or run `vercel --prod`)

## Best Practices

### Long-term Production Setup

1. **Create IAM User**:
   - Create dedicated IAM user for this app
   - Attach policy with only S3 permissions
   - Use permanent credentials (no session token)

2. **Minimal IAM Policy**:
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

3. **Secrets Management**:
   - Never commit credentials to git
   - Use Vercel environment variables
   - Rotate credentials regularly

## Monitoring

### Vercel Dashboard
- **Deployments**: View build status and logs
- **Analytics**: Track page views and performance
- **Functions**: Monitor API endpoint usage

### Browser Console
- Check for "Annotation saved to S3" messages
- Watch for API errors
- Monitor network requests to `/api/`

### S3 CSV File
- Download from S3 console to verify updates
- Check last modified timestamp
- Validate CSV format

## Cost Considerations

- **Vercel Free Tier**: Sufficient for this app
- **S3 Costs**: Minimal (few KB CSV file)
- **API Calls**: Each annotation triggers 1 GET + 1 PUT to S3

## Support

If issues persist:
1. Check Vercel build logs
2. Check Vercel function logs (Deployments → Click deployment → Functions tab)
3. Test API endpoints directly
4. Verify S3 permissions in AWS Console
