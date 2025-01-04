export const generateSafeFileName = (baseName: string, extension: string): string => {
  // Remove any non-ASCII characters and spaces
  const safeName = baseName.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_');
  return `${safeName}.${extension}`;
};

export const getContentType = (fileName: string, mediaType: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'mov': 'video/quicktime',
    'mp4': 'video/mp4',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  return ext && mimeTypes[ext] 
    ? mimeTypes[ext] 
    : (mediaType || 'application/octet-stream');
};

export const getBucketId = (): string => {
  return 'telegram-media';
};