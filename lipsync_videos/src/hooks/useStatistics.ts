import { useMemo } from 'react';
import type { Video, VideoAnnotation, Statistics, FieldCounts } from '../types';

const REQUIRED_FIELDS = ['source', 'content_type', 'direction', 'size', 'include', 'category'];

export function useStatistics(
  videos: Video[],
  existingAnnotations: Record<string, VideoAnnotation>,
  annotations: Record<string, VideoAnnotation>
): Statistics {
  return useMemo(() => {
    const totalVideos = videos.length;
    const totalFields = totalVideos * REQUIRED_FIELDS.length;

    // Initialize field counts
    const fieldCounts: FieldCounts = {
      source: {},
      content_type: {},
      direction: {},
      size: {},
      include: {},
      category: {},
    };

    let filledFields = 0;
    let completeVideos = 0;

    // Count filled fields and complete videos
    videos.forEach((video) => {
      const existing = existingAnnotations[video.path] || {};
      const annotation = annotations[video.path] || {};
      const data = { ...existing, ...annotation };

      let videoFilledFields = 0;

      REQUIRED_FIELDS.forEach((field) => {
        const value = data[field as keyof VideoAnnotation];
        if (value) {
          filledFields++;
          videoFilledFields++;

          // Count field values
          if (!fieldCounts[field][value]) {
            fieldCounts[field][value] = 0;
          }
          fieldCounts[field][value]++;
        }
      });

      if (videoFilledFields === REQUIRED_FIELDS.length) {
        completeVideos++;
      }
    });

    const remainingVideos = totalVideos - completeVideos;
    const progressPercent = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

    return {
      totalVideos,
      completeVideos,
      remainingVideos,
      progressPercent,
      fieldCounts,
    };
  }, [videos, existingAnnotations, annotations]);
}
