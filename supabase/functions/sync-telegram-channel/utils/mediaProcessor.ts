import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAndDownloadTelegramFile } from "../../_shared/telegram.ts";
import { logOperation } from "../../_shared/database.ts";

export async function processMediaMessage(message: any, channelId: number, supabase: any, botToken: string) {
  console.log(`[processMediaMessage] Processing message ${message.message_id} from channel ${channelId}`);
  
  const mediaItem = message.photo 
    ? message.photo[message.photo.length - 1] 
    : message.video || message.document;

  if (!mediaItem) {
    console.log(`[processMediaMessage] No media found in message ${message.message_id}`);
    return null;
  }

  try {
    // Check if media already exists
    const { data: existingMedia } = await supabase
      .from('media')
      .select('id')
      .eq('metadata->file_unique_id', mediaItem.file_unique_id)
      .single();

    if (existingMedia) {
      console.log(`[processMediaMessage] Media already exists: ${existingMedia.id}`);
      return null;
    }

    // Download and process new media
    console.log(`[processMediaMessage] Downloading media file: ${mediaItem.file_id}`);
    const { buffer, filePath } = await getAndDownloadTelegramFile(
      mediaItem.file_id,
      botToken
    );

    const timestamp = Date.now();
    const fileName = `${mediaItem.file_unique_id}_${timestamp}.${filePath.split('.').pop() || 'unknown'}`;

    const mediaType = message.photo 
      ? 'image/jpeg' 
      : (message.video ? 'video/mp4' : 'application/octet-stream');

    console.log(`[processMediaMessage] Uploading to storage: ${fileName}`);
    
    // First, check if file exists in storage
    const { data: existingFile } = await supabase.storage
      .from('telegram-media')
      .list('', {
        limit: 1,
        search: fileName
      });

    if (existingFile && existingFile.length > 0) {
      console.log(`[processMediaMessage] File already exists in storage: ${fileName}`);
      return null;
    }

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('telegram-media')
      .upload(fileName, buffer, {
        contentType: mediaType,
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('[processMediaMessage] Upload error:', uploadError);
      throw uploadError;
    }

    // Generate public URL
    const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${fileName}`;

    const metadata = {
      file_id: mediaItem.file_id,
      file_unique_id: mediaItem.file_unique_id,
      message_id: message.message_id,
      media_group_id: message.media_group_id,
      content_type: mediaType,
      mime_type: mediaType,
      file_size: mediaItem.file_size,
      file_path: filePath,
      original_message: message
    };

    console.log(`[processMediaMessage] Saving to database with public URL: ${publicUrl}`);
    
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
        public_url: publicUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (mediaError) {
      console.error('[processMediaMessage] Error saving media:', mediaError);
      await logOperation(
        supabase,
        'sync-telegram-channel',
        'error',
        `Error saving media for message ${message.message_id}: ${mediaError.message}`
      );
      throw mediaError;
    }

    // Also create a message record
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: mediaData.user_id,
        chat_id: channelId,
        message_id: message.message_id,
        sender_name: message.from?.first_name || 'Unknown',
        text: message.caption,
        media_type: mediaType,
        media_url: publicUrl,
        public_url: publicUrl,
        created_at: new Date(message.date * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });

    if (messageError) {
      console.error('[processMediaMessage] Error saving message:', messageError);
      await logOperation(
        supabase,
        'sync-telegram-channel',
        'error',
        `Error saving message ${message.message_id}: ${messageError.message}`
      );
    }

    console.log(`[processMediaMessage] Successfully processed media: ${mediaData.id}`);
    return { mediaData, publicUrl };
  } catch (error) {
    console.error('[processMediaMessage] Error processing media message:', error);
    await logOperation(
      supabase,
      'sync-telegram-channel',
      'error',
      `Error processing media message ${message.message_id}: ${error.message}`
    );
    throw error;
  }
}