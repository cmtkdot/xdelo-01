import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAndDownloadTelegramFile } from "../../_shared/telegram.ts";

export async function processMediaMessage(
  supabase: ReturnType<typeof createClient>,
  message: any,
  botToken: string
) {
  try {
    let fileId = '';
    let mediaType = '';
    let caption = message.caption || '';

    // Determine file ID and media type
    if (message.photo) {
      // For photos, use the last (highest quality) version
      fileId = message.photo[message.photo.length - 1].file_id;
      mediaType = 'image';
    } else if (message.video) {
      fileId = message.video.file_id;
      mediaType = 'video';
    } else if (message.document) {
      fileId = message.document.file_id;
      mediaType = 'document';
    } else {
      return { error: 'No media found in message' };
    }

    console.log(`Processing ${mediaType} with file ID: ${fileId}`);

    // Download file from Telegram
    const { buffer, filePath } = await getAndDownloadTelegramFile(fileId, botToken);
    
    // Generate a unique filename
    const fileName = `${Date.now()}-${filePath.split('/').pop()}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('telegram-media')
      .upload(fileName, buffer);

    if (uploadError) {
      console.error('[processMediaMessage] Upload error:', uploadError);
      return { error: 'Failed to upload media', details: uploadError };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('telegram-media')
      .getPublicUrl(fileName);

    // Create media record
    const { data: mediaData, error: insertError } = await supabase
      .from('media')
      .insert({
        user_id: message.from?.id ? message.from.id.toString() : null,
        chat_id: message.chat.id,
        file_name: fileName,
        file_url: publicUrl,
        media_type: mediaType,
        caption: caption,
        media_group_id: message.media_group_id,
        metadata: {
          message_id: message.message_id,
          file_id: fileId,
          original_file_name: filePath.split('/').pop()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('[processMediaMessage] Insert error:', insertError);
      return { error: 'Failed to create media record', details: insertError };
    }

    return { 
      mediaId: mediaData.id,
      publicUrl: publicUrl
    };

  } catch (error) {
    console.error('[processMediaMessage] Error:', error);
    return { error: error.message };
  }
}