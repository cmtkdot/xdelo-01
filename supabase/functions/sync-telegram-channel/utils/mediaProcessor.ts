import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAndDownloadTelegramFile } from "../../_shared/telegram.ts";
import { getContentType, getBucketId, generateSafeFileName } from "../../telegram-media-webhook/utils/fileHandling.ts";

export async function processMediaMessage(message: any, channelId: number, supabase: any, botToken: string) {
  const mediaItem = message.photo 
    ? message.photo[message.photo.length - 1] 
    : message.video || message.document;

  if (!mediaItem) return null;

  try {
    console.log('Processing media item:', { mediaItem, message });

    // Download file from Telegram using the shared utility
    const { buffer: fileContent, filePath } = await getAndDownloadTelegramFile(
      mediaItem.file_id,
      botToken
    );

    // Generate safe file name
    const timestamp = Date.now();
    const fileExt = filePath.split('.').pop()?.toLowerCase() || 'unknown';
    const safeFileName = generateSafeFileName(
      `${mediaItem.file_unique_id}_${timestamp}`,
      fileExt
    );

    // Determine media type
    let mediaType = message.document?.mime_type || 'application/octet-stream';
    if (message.photo) {
      mediaType = 'image/jpeg';
    } else if (message.video) {
      mediaType = 'video/mp4';
    }

    const bucketId = getBucketId();
    console.log('Uploading to bucket:', bucketId);

    const contentType = getContentType(safeFileName, mediaType);
    console.log('Using content type:', contentType);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketId)
      .upload(safeFileName, fileContent, {
        contentType,
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    // Generate public URL
    const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucketId}/${safeFileName}`;
    console.log('Generated public URL:', publicUrl);

    const metadata = {
      file_id: mediaItem.file_id,
      file_unique_id: mediaItem.file_unique_id,
      file_size: mediaItem.file_size,
      message_id: message.message_id,
      media_group_id: message.media_group_id,
      content_type: contentType,
      mime_type: mediaType,
      file_path: filePath
    };

    // Insert into media table
    const mediaData = {
      user_id: crypto.randomUUID(), // This should be replaced with actual user ID in production
      chat_id: message.chat.id,
      file_name: safeFileName,
      file_url: publicUrl,
      media_type: mediaType,
      caption: message.caption,
      metadata,
      media_group_id: message.media_group_id,
      public_url: publicUrl
    };

    const { data: savedMedia, error: dbError } = await supabase
      .from('media')
      .insert([mediaData])
      .select()
      .single();

    if (dbError) {
      console.error('Error saving media to database:', dbError);
      throw dbError;
    }

    return { mediaData: savedMedia, publicUrl };
  } catch (error) {
    console.error('Error in processMediaMessage:', error);
    throw error;
  }
}