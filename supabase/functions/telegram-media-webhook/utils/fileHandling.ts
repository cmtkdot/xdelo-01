export const generateSafeFileName = (baseName: string, extension: string): string => {
  // Remove any non-ASCII characters and spaces
  const safeName = baseName.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_');
  return `${safeName}.${extension}`;
};

export const getContentType = (fileName: string, mediaType: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  // Handle specific file types
  switch (ext) {
    case 'mov':
      return 'video/quicktime';
    case 'mp4':
      return 'video/mp4';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    default:
      // Use provided mediaType as fallback
      return mediaType || 'application/octet-stream';
  }
};

export const getBucketId = (mediaType: string, fileExt: string | undefined): string => {
  if (mediaType.startsWith('video') || fileExt === 'mov') {
    return 'telegram-video';
  }
  if (mediaType.startsWith('image') || ['jpg', 'jpeg', 'png', 'gif'].includes(fileExt || '')) {
    return 'telegram-pictures';
  }
  return 'telegram-media';
};