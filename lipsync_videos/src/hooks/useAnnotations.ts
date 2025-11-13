import { useState, useCallback } from 'react';
import type { Video, VideoAnnotation } from '../types';
import { generateCSV } from '../utils/csv';

export function useAnnotations(existingAnnotations: Record<string, VideoAnnotation>) {
  const [annotations, setAnnotations] = useState<Record<string, VideoAnnotation>>({});

  const saveAnnotation = useCallback(async (annotation: VideoAnnotation) => {
    // Update local state
    setAnnotations((prev) => ({
      ...prev,
      [annotation.path]: annotation,
    }));

    // Auto-save to S3 via API
    try {
      const response = await fetch('/api/save-annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          annotation,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save annotation to S3');
      }

      console.log('Annotation saved to S3:', annotation.path);
    } catch (error) {
      console.error('Error saving annotation to S3:', error);
      // Don't block UI - annotation is still saved locally
    }
  }, []);

  const exportCSV = useCallback(
    (videos: Video[]) => {
      // Merge existing and new annotations
      const merged: Record<string, VideoAnnotation> = { ...existingAnnotations, ...annotations };

      // Generate CSV
      const csv = generateCSV(videos, merged);

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', 'final_meta.csv');
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`Exported ${Object.keys(merged).length} annotations`);
    },
    [existingAnnotations, annotations]
  );

  return { annotations, saveAnnotation, exportCSV };
}
