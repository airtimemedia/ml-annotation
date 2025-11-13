export interface Video {
  url: string;
  path: string;
}

export interface VideoAnnotation {
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

export interface VideoData {
  videos: Video[];
  existingAnnotations: Record<string, VideoAnnotation>;
}

export interface FieldCounts {
  [field: string]: Record<string, number>;
}

export interface Statistics {
  totalVideos: number;
  completeVideos: number;
  remainingVideos: number;
  progressPercent: number;
  fieldCounts: FieldCounts;
}
