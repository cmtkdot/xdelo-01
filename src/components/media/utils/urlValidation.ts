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

  // Validate URL pattern for Supabase storage
  const storagePattern = /storage\/v1\/object\/public\/(telegram-[^/]+)\//;
  if (!url?.match(storagePattern)) {
    console.warn(`URL does not match storage pattern: ${url}`);
    return null;
  }

  // Validate bucket based on media type
  if (mediaType) {
    const bucket = url.match(storagePattern)?.[1];
    const isVideoContent = mediaType.includes('video');
    const isImageContent = mediaType.includes('image') || mediaType.includes('photo');
    
    if (isVideoContent && bucket !== 'telegram-video') {
      console.warn(`Video content in wrong bucket: ${bucket}`);
    } else if (isImageContent && bucket !== 'telegram-pictures') {
      console.warn(`Image content in wrong bucket: ${bucket}`);
    }
  }

  return url;
};