import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAndDownloadTelegramFile } from "../../_shared/telegram.ts";
import { uploadToStorage } from "../../_shared/storage.ts";
import { createMediaRecord } from "../../_shared/database.ts";

export const processMedia = async (
  supabase: ReturnType<typeof createClient>,
  message: any,
  botToken: string,
  userId: string
) => {
  if (!message.photo && !message.video && !message.document && !message.animation) {
    return null;
  }

  let fileId = '';
  let mediaType = '';
  let caption = message.caption || '';
  let fileUniqueId = '';
  let width = null;
  let height = null;
  let fileSize = null;

  // Determine media type and get file details
  if (message.photo) {
    const photo = message.photo[message.photo.length - 1];
    fileId = photo.file_id;
    fileUniqueId = photo.file_unique_id;
    mediaType = 'image';
    width = photo.width;
    height = photo.height;
    fileSize = photo.file_size;
  } else if (message.video) {
    fileId = message.video.file_id;
    fileUniqueId = message.video.file_unique_id;
    mediaType = 'video';
    width = message.video.width;
    height = message.video.height;
    fileSize = message.video.file_size;
  } else if (message.document) {
    fileId = message.document.file_id;
    fileUniqueId = message.document.file_unique_id;
    mediaType = 'document';
    fileSize = message.document.file_size;
  } else if (message.animation) {
    fileId = message.animation.file_id;
    fileUniqueId = message.animation.file_unique_id;
    mediaType = 'animation';
    width = message.animation.width;
    height = message.animation.height;
    fileSize = message.animation.file_size;
  }

  // Check for existing media
  const { data: existingMedia } = await supabase
    .from('media')
    .select('id, file_url')
    .eq('file_unique_id', fileUniqueId)
    .single();

  if (existingMedia) {
    console.log('[processMedia] Media already exists:', existingMedia.id);
    return {
      mediaId: existingMedia.id,
      fileUrl: existingMedia.file_url,
      mediaType
    };
  }

  // Download and process new media
  const { buffer, filePath } = await getAndDownloadTelegramFile(fileId, botToken);
  
  // Generate unique filename
  const fileName = `${Date.now()}-${fileUniqueId}-${filePath.split('/').pop()}`;
  
  // Upload to Supabase Storage
  const fileUrl = await uploadToStorage(
    supabase,
    fileName,
    buffer,
    mediaType === 'image' ? 'image/jpeg' : 
    mediaType === 'video' ? 'video/mp4' : 
    'application/octet-stream'
  );

  // Create media record
  const mediaData = await createMediaRecord(
    supabase,
    userId,
    message.chat.id,
    fileName,
    fileUrl,
    mediaType,
    caption,
    {
      message_id: message.message_id,
      file_id: fileId,
      file_unique_id: fileUniqueId,
      media_group_id: message.media_group_id,
      chat_type: message.chat.type,
      forward_info: message.forward_from || message.forward_from_chat,
      file_size_mb: fileSize ? Number((fileSize / (1024 * 1024)).toFixed(2)) : null,
      photo_width: width,
      photo_height: height,
      message_date: new Date(message.date * 1000).toISOString(),
      source_channel: message.chat.title || message.chat.username,
      is_forwarded: !!message.forward_from || !!message.forward_from_chat,
      original_source: message.forward_from_chat?.title || message.forward_from?.first_name
    },
    message.media_group_id,
    fileUrl
  );

  return {
    mediaId: mediaData.id,
    fileUrl,
    mediaType
  };
};