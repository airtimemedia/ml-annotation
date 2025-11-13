import { useState, useEffect } from 'react';
import type { Video, VideoAnnotation } from '../types';
import { parseCSV } from '../utils/csv';

export function useVideoData() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [existingAnnotations, setExistingAnnotations] = useState<Record<string, VideoAnnotation>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        console.log('[useVideoData] Fetching CSV from /api/fetch-csv...');

        // Fetch CSV from S3 via API
        const csvResponse = await fetch('/api/fetch-csv');
        console.log('[useVideoData] Response status:', csvResponse.status);

        if (!csvResponse.ok) {
          const errorText = await csvResponse.text();
          console.error('[useVideoData] Failed to fetch CSV:', errorText);
          throw new Error(`Could not load CSV from S3: ${csvResponse.status} ${errorText}`);
        }

        const csvText = await csvResponse.text();
        console.log('[useVideoData] CSV length:', csvText.length);
        console.log('[useVideoData] CSV preview:', csvText.substring(0, 200));

        const parsed = parseCSV(csvText);
        console.log('[useVideoData] Parsed annotations:', Object.keys(parsed).length);

        // Extract video list from CSV (all paths become videos)
        const videoList: Video[] = Object.keys(parsed).map(path => ({
          url: path, // The path IS the S3 URL
          path: path,
        }));

        console.log('[useVideoData] Video list:', videoList.length, 'videos');
        if (videoList.length > 0) {
          console.log('[useVideoData] First video:', videoList[0]);
        }

        setVideos(videoList);
        setExistingAnnotations(parsed);
        console.log(`✅ Loaded ${videoList.length} videos and ${Object.keys(parsed).length} existing annotations`);

        setIsLoading(false);
      } catch (err) {
        console.error('[useVideoData] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return { videos, existingAnnotations, isLoading, error };
}
