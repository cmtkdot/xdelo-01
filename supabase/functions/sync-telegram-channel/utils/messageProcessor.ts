import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { uploadToStorage, generateSafeFileName } from "../../_shared/storage.ts";
import { getAndDownloadTelegramFile } from "../../_shared/telegram.ts";

export async function processMessage(message: any, channelId: number, supabase: any, botToken: string) {
  try {
    const mediaItem = message.photo 
      ? message.photo[message.photo.length - 1] 
      : message.video || message.document;

    if (!mediaItem) return null;

    // Check if media already exists
    const { data: existingMedia } = await supabase
      .from('media')
      .select('id')
      .eq('metadata->file_unique_id', mediaItem.file_unique_id)
      .single();

    if (existingMedia) {
      console.log(`Media item already exists: ${existingMedia.id}`);
      return null;
    }

    // Download and process new media
    const { buffer, filePath } = await getAndDownloadTelegramFile(
      mediaItem.file_id,
      botToken
    );

    const timestamp = Date.now();
    const fileName = generateSafeFileName(
      `${mediaItem.file_unique_id}_${timestamp}`,
      filePath.split('.').pop() || 'unknown'
    );

    const mediaType = message.photo 
      ? 'image/jpeg' 
      : (message.video ? 'video/mp4' : 'application/octet-stream');

    const publicUrl = await uploadToStorage(
      supabase,
      fileName,
      buffer,
      mediaType
    );

    const metadata = {
      file_id: mediaItem.file_id,
      file_unique_id: mediaItem.file_unique_id,
      message_id: message.message_id,
      media_group_id: message.media_group_id,
      content_type: mediaType,
      mime_type: mediaType,
      file_size: mediaItem.file_size,
      file_path: filePath
    };

    // Create media record
    const { data: mediaData, error: mediaError } = await supabase
      .from('media')
      .insert({
        user_id: crypto.randomUUID(), // This should be replaced with actual user ID in production
        chat_id: channelId,
        file_name: fileName,
        file_url: publicUrl,
        media_type: mediaType,
        caption: message.caption,
        metadata,
        media_group_id: message.media_group_id,
        public_url: publicUrl
      })
      .select()
      .single();

    if (mediaError) throw mediaError;

    // Log bot activity
    await supabase
      .from('bot_activities')
      .insert({
        event_type: 'media_sync',
        chat_id: channelId,
        message_id: message.message_id,
        message_type: mediaType,
        details: {
          media_id: mediaData.id,
          file_name: fileName,
          sync_type: 'channel_history'
        }
      });

    return { mediaData, publicUrl };
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}