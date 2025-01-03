import { Json } from '../base';

export const generateSafeFileName = (name: string, extension: string): string => {
  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${safeName}.${extension}`;
};

export const determineMediaType = (message: any): string => {
  if (message.photo) return 'photo';
  if (message.video) return 'video';
  if (message.audio) return 'audio';
  if (message.document) return 'document';
  return 'unknown';
};

export const getMediaItem = (message: any): any => {
  return message.photo || message.video || message.audio || message.document;
};

export const formatMediaMetadata = (mediaItem: any, message: any): any => {
  return {
    file_id: mediaItem.file_id,
    caption: message.caption || message.text || null,
    media_type: determineMediaType(message),
  };
};

export const generatePublicUrl = (bucket: string, fileName: string): string => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is not set');
  }
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
};

export const getContentType = (fileName: string, mediaType: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'pdf':
      return 'application/pdf';
    default:
      switch (mediaType) {
        case 'photo':
          return 'image/jpeg';
        case 'video':
          return 'video/mp4';
        case 'audio':
          return 'audio/mpeg';
        default:
          return 'application/octet-stream';
      }
  }
};