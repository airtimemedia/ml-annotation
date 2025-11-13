import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bucketName = process.env.AWS_BUCKET_NAME || 'cantina-testsets';
  const csvKey = 'LIPSYNC_V1/final_meta_ui.csv';

  console.log('[fetch-csv] Fetching from S3...');
  console.log('[fetch-csv] Bucket:', bucketName);
  console.log('[fetch-csv] Key:', csvKey);
  console.log('[fetch-csv] Region:', process.env.AWS_REGION || 'us-east-1');
  console.log('[fetch-csv] Has AWS_ACCESS_KEY_ID:', !!process.env.AWS_ACCESS_KEY_ID);
  console.log('[fetch-csv] Has AWS_SECRET_ACCESS_KEY:', !!process.env.AWS_SECRET_ACCESS_KEY);
  console.log('[fetch-csv] Has AWS_SESSION_TOKEN:', !!process.env.AWS_SESSION_TOKEN);

  try {
    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      },
    });

    // Fetch CSV from S3
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: csvKey,
    });

    console.log('[fetch-csv] Sending S3 request...');

    const response = await s3Client.send(command);
    console.log('[fetch-csv] S3 response received');

    const csvContent = await response.Body?.transformToString();
    console.log('[fetch-csv] CSV content length:', csvContent?.length || 0);

    if (!csvContent) {
      console.error('[fetch-csv] CSV content is empty');
      throw new Error('Empty CSV file');
    }

    console.log('[fetch-csv] ✅ Successfully fetched CSV from s3://' + bucketName + '/' + csvKey);
    console.log('[fetch-csv] CSV preview:', csvContent.substring(0, 100));

    // Return CSV as plain text
    res.setHeader('Content-Type', 'text/csv');
    return res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('[fetch-csv] ❌ Error fetching CSV from S3:', error);
    console.error('[fetch-csv] Error name:', error.name);
    console.error('[fetch-csv] Error message:', error.message);
    console.error('[fetch-csv] Full S3 path: s3://' + bucketName + '/' + csvKey);

    return res.status(500).json({
      error: 'Failed to fetch CSV from S3',
      message: error.message,
      bucket: bucketName,
      key: csvKey,
      fullPath: `s3://${bucketName}/${csvKey}`,
    });
  }
}
