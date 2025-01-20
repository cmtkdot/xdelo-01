import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAndDownloadTelegramFile } from "../../_shared/telegram.ts";

export async function processMediaMessage(
  supabase: ReturnType<typeof createClient>,
  message: any,
  botToken: string
) {
  try {
    console.log("[processMediaMessage] Starting media processing for message:", message.message_id);
    
    let fileId = '';
    let mediaType = '';
    let caption = message.caption || '';
    let width = null;
    let height = null;
    let fileSize = null;
    let fileUniqueId = null;

    // Determine file ID and media type
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
    } else {
      console.log("[processMediaMessage] No media found in message");
      return { error: 'No media found in message' };
    }

    console.log(`[processMediaMessage] Processing ${mediaType} with file ID: ${fileId}`);

    // Check if file already exists for this chat
    const { data: existingMedia } = await supabase
      .from('media')
      .select('id, file_url, public_url')
      .eq('chat_id', message.chat.id)
      .eq('file_unique_id', fileUniqueId)
      .maybeSingle();

    if (existingMedia) {
      console.log('[processMediaMessage] Media already exists, returning existing record:', existingMedia.id);
      return {
        mediaId: existingMedia.id,
        publicUrl: existingMedia.public_url || existingMedia.file_url,
        existing: true
      };
    }

    // Download file from Telegram
    const { buffer, filePath } = await getAndDownloadTelegramFile(fileId, botToken);
    
    // Generate a unique filename
    const fileName = `${Date.now()}-${filePath.split('/').pop()}`;

    console.log("[processMediaMessage] Uploading file to storage:", fileName);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('telegram-media')
      .upload(fileName, buffer, {
        contentType: mediaType === 'image' ? 'image/jpeg' : 
                    mediaType === 'video' ? 'video/mp4' : 
                    'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('[processMediaMessage] Upload error:', uploadError);
      return { error: 'Failed to upload media', details: uploadError };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('telegram-media')
      .getPublicUrl(fileName);

    console.log("[processMediaMessage] File uploaded successfully, public URL:", publicUrl);

    try {
      // Create media record with enhanced metadata
      const { data: mediaData, error: insertError } = await supabase
        .from('media')
        .insert({
          user_id: message.from?.id ? message.from.id.toString() : null,
          chat_id: message.chat.id,
          file_name: fileName,
          file_url: publicUrl,
          public_url: publicUrl,
          media_type: mediaType,
          caption: caption,
          media_group_id: message.media_group_id,
          file_size_mb: fileSize ? Number((fileSize / (1024 * 1024)).toFixed(2)) : null,
          photo_width: width,
          photo_height: height,
          message_date: new Date(message.date * 1000).toISOString(),
          source_channel: message.chat.title || message.chat.username,
          is_forwarded: !!message.forward_from || !!message.forward_from_chat,
          original_source: message.forward_from_chat?.title || message.forward_from?.first_name,
          file_unique_id: fileUniqueId,
          metadata: {
            message_id: message.message_id,
            file_id: fileId,
            original_file_name: filePath.split('/').pop(),
            forward_info: message.forward_from || message.forward_from_chat,
            chat_type: message.chat.type
          }
        })
        .select()
        .single();

      if (insertError) {
        console.error('[processMediaMessage] Insert error:', insertError);
        return { error: 'Failed to create media record', details: insertError };
      }

      console.log('[processMediaMessage] Media record created successfully:', mediaData.id);

      return { 
        mediaId: mediaData.id,
        publicUrl: publicUrl
      };

    } catch (dbError) {
      console.error('[processMediaMessage] Database error:', dbError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('telegram-media').remove([fileName]);
      return { error: 'Database operation failed', details: dbError };
    }

  } catch (error) {
    console.error('[processMediaMessage] Error:', error);
    return { error: error.message };
  }
}