export const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateMediaUrl = (url: string | null | undefined, mediaType?: string): string | null => {
  if (!isValidUrl(url)) {
    console.warn(`Invalid URL detected: ${url}`);
    return null;
  }

  // Try to extract bucket name from URL
  const bucketPattern = /storage\/v1\/object\/public\/(telegram-[^/]+)\//;
  const match = url?.match(bucketPattern);
  const currentBucket = match?.[1];

  if (!currentBucket) {
    console.warn(`URL does not match storage pattern: ${url}`);
    return null;
  }

  // If URL is valid but file is not accessible, try alternative buckets
  const tryAlternativeBucket = async (originalUrl: string, mediaType: string): Promise<string | null> => {
    try {
      const response = await fetch(originalUrl, { method: 'HEAD' });
      if (response.ok) return originalUrl;

      // Extract filename from original URL
      const filename = originalUrl.split('/').pop();
      if (!filename) return null;

      // Try alternative buckets based on media type
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public`;
      
      if (mediaType?.includes('video') || filename.toLowerCase().endsWith('.mov')) {
        const videoUrl = `${baseUrl}/telegram-video/${filename}`;
        const videoResponse = await fetch(videoUrl, { method: 'HEAD' });
        if (videoResponse.ok) return videoUrl;
      }
      
      if (mediaType?.includes('image') || mediaType?.includes('photo') || 
          filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        const imageUrl = `${baseUrl}/telegram-pictures/${filename}`;
        const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
        if (imageResponse.ok) return imageUrl;
      }

      // Fallback to telegram-media bucket
      const fallbackUrl = `${baseUrl}/telegram-media/${filename}`;
      const fallbackResponse = await fetch(fallbackUrl, { method: 'HEAD' });
      if (fallbackResponse.ok) return fallbackUrl;

      return null;
    } catch (error) {
      console.error('Error checking URL availability:', error);
      return null;
    }
  };

  return url;
};

export const getBucketForMediaType = (mediaType: string, filename: string): string => {
  if (mediaType?.includes('video') || filename.toLowerCase().endsWith('.mov')) {
    return 'telegram-video';
  }
  if (mediaType?.includes('image') || mediaType?.includes('photo') || 
      filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return 'telegram-pictures';
  }
  return 'telegram-media';
};

export const generatePublicUrl = (filename: string, mediaType: string): string => {
  const bucket = getBucketForMediaType(mediaType, filename);
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;
};