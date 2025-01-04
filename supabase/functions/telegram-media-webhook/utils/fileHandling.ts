import { Json } from "https://esm.sh/@supabase/supabase-js@2";

export const generateSafeFileName = (baseName: string, extension: string) => {
  const timestamp = Date.now();
  return `${baseName}_${timestamp}.${extension}`;
};

export const determineMediaType = (message: any) => {
  if (message.photo) return 'photo';
  if (message.document) return message.document.mime_type || 'document';
  if (message.video) return 'video';
  if (message.audio) return 'audio';
  if (message.voice) return 'voice';
  if (message.animation) return 'animation';
  if (message.sticker) return 'sticker';
  return 'unknown';
};

export const getMediaItem = (message: any) => {
  return message.photo 
    ? message.photo[message.photo.length - 1] 
    : message.document || message.video || message.audio || 
      message.voice || message.animation || message.sticker;
};

export const formatMediaMetadata = (mediaItem: any, message: any) => {
  // Ensure we're returning a valid object structure
  return {
    file_id: mediaItem.file_id || null,
    file_unique_id: mediaItem.file_unique_id || null,
    file_size: mediaItem.file_size || null,
    message_id: message.message_id || null,
    media_group_id: message.media_group_id || null,
    // Add any additional metadata fields with null fallbacks
    width: mediaItem.width || null,
    height: mediaItem.height || null,
    duration: mediaItem.duration || null,
    mime_type: mediaItem.mime_type || null
  };
};

export const getContentType = (fileName: string, mediaType: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (mediaType === 'photo') return 'image/jpeg';
  if (mediaType === 'video') return 'video/mp4';
  if (mediaType === 'audio') return 'audio/mpeg';
  return 'application/octet-stream';
};

export const generatePublicUrl = (bucketId: string, fileName: string) => {
  return `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucketId}/${fileName}`;
};
