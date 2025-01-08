import { getAndDownloadTelegramFile } from "../../_shared/telegram.ts";
import { uploadToStorage } from "../../_shared/storage.ts";
import { createMediaRecord, logOperation } from "../../_shared/database.ts";

const getMediaItem = (message: any) => {
  if (message.photo) {
    return message.photo[message.photo.length - 1];
  }
  return message.video || message.document;
};

const checkExistingMedia = async (supabase: any, fileUniqueId: string) => {
  const { data: existingMedia } = await supabase
    .from('media')
    .select('id')
    .eq('metadata->file_unique_id', fileUniqueId)
    .single();
  
  return existingMedia;
};

export const handleMediaUpload = async (supabase: any, message: any, userId: string, botToken: string) => {
  try {
    const mediaItem = getMediaItem(message);
    if (!mediaItem?.file_id) {
      console.log('No valid media found in message:', message);
      return null;
    }

    // Check for existing media
    const existingMedia = await checkExistingMedia(supabase, mediaItem.file_unique_id);
    if (existingMedia) {
      console.log('Media already exists:', existingMedia.id);
      return existingMedia;
    }

    // Download and process new media
    const { buffer, filePath } = await getAndDownloadTelegramFile(mediaItem.file_id, botToken);
    
    const timestamp = Date.now();
    const fileName = `${mediaItem.file_unique_id}_${timestamp}.${filePath.split('.').pop() || 'unknown'}`;
    
    const mediaType = message.photo 
      ? 'image/jpeg' 
      : (message.video ? 'video/mp4' : 'application/octet-stream');

    // Upload to storage
    const publicUrl = await uploadToStorage(supabase, fileName, buffer, mediaType);

    // Create media record
    const metadata = {
      file_id: mediaItem.file_id,
      file_unique_id: mediaItem.file_unique_id,
      message_id: message.message_id,
      media_group_id: message.media_group_id,
      content_type: mediaType,
      file_size: mediaItem.file_size,
      file_path: filePath
    };

    return await createMediaRecord(
      supabase,
      userId,
      message.chat.id,
      fileName,
      publicUrl,
      mediaType,
      message.caption,
      metadata,
      message.media_group_id,
      publicUrl
    );

  } catch (error) {
    console.error('Error in handleMediaUpload:', error);
    await logOperation(
      supabase,
      'telegram-media-webhook',
      'error',
      `Error uploading media: ${error.message}`
    );
    throw error;
  }
};