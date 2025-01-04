import { Json } from "../../../src/integrations/supabase/types/base";

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

export const formatMediaMetadata = (mediaItem: any, message: any): Json => {
  // Ensure all values are strings to match our constraint
  return {
    file_id: mediaItem.file_id?.toString() || 'legacy_file',
    file_unique_id: mediaItem.file_unique_id?.toString() || `legacy_${crypto.randomUUID()}`,
    file_size: mediaItem.file_size?.toString() || '0',
    message_id: message.message_id?.toString() || '0',
    media_group_id: message.media_group_id?.toString() || null
  };
};

export const getContentType = (fileName: string, mediaType: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (mediaType === 'photo') return 'image/jpeg';
  if (mediaType === 'video') return 'video/mp4';
  if (mediaType === 'audio') return 'audio/mpeg';
  return 'application/octet-stream';
};

export const getBucketId = (mediaType: string, fileExt: string | undefined) => {
  if (mediaType === 'video' || fileExt === 'mov') return 'telegram-video';
  if (mediaType === 'photo' || mediaType.includes('image')) return 'telegram-pictures';
  return 'telegram-media';
};

export const generatePublicUrl = (bucketId: string, fileName: string) => {
  return `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucketId}/${fileName}`;
};