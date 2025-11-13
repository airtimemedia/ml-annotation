/**
 * Vercel Serverless Function to save annotations to S3
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface VideoAnnotation {
  path: string;
  source?: string;
  content_type?: string;
  direction?: string;
  size?: string;
  include?: string;
  category?: string;
  notes?: string;
  last_updated?: string;
}

export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { annotation } = req.body as { annotation: VideoAnnotation };

    if (!annotation || !annotation.path) {
      return res.status(400).json({ error: 'Missing annotation data or path' });
    }

    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      },
    });

    const bucketName = process.env.AWS_BUCKET_NAME!;
    const csvKey = 'LIPSYNC_V1/final_meta_ui.csv';

    // Fetch existing CSV
    let existingData: Record<string, VideoAnnotation> = {};
    try {
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: csvKey,
      });

      const response = await s3Client.send(getCommand);
      const csvContent = await response.Body?.transformToString();

      if (csvContent) {
        existingData = parseCSV(csvContent);
      }
    } catch (error: any) {
      // File doesn't exist yet, that's okay
      if (error.name !== 'NoSuchKey') {
        console.error('Error fetching existing CSV:', error);
      }
    }

    // Merge with new annotation
    existingData[annotation.path] = annotation;

    // Generate CSV
    const csv = generateCSV(existingData);

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: csvKey,
      Body: csv,
      ContentType: 'text/csv',
    });

    await s3Client.send(putCommand);

    return res.status(200).json({
      success: true,
      message: 'Annotation saved to S3',
      path: annotation.path,
    });
  } catch (error: any) {
    console.error('Error saving annotation:', error);
    return res.status(500).json({
      error: 'Failed to save annotation',
      message: error.message,
    });
  }
}

function parseCSV(text: string): Record<string, VideoAnnotation> {
  const lines = text.split('\n');
  if (lines.length < 2) return {};

  const headers = lines[0].split(',').map((h) => h.trim());
  const data: Record<string, VideoAnnotation> = {};

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = parseCSVLine(lines[i]);
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    if (row.path) {
      data[row.path] = row;
    }
  }

  return data;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function generateCSV(data: Record<string, VideoAnnotation>): string {
  const headers = [
    'path',
    'source',
    'content_type',
    'direction',
    'size',
    'include',
    'category',
    'notes',
    'last_updated',
  ];

  let csv = headers.join(',') + '\n';

  Object.values(data).forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header as keyof VideoAnnotation] || '';
      const stringValue = String(value);

      // Escape values with commas or quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });

    csv += values.join(',') + '\n';
  });

  return csv;
}
