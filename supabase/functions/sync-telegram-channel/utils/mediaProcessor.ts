import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getContentType, getBucketId, generateSafeFileName } from "../../telegram-media-webhook/utils/fileHandling.ts";

export async function processMediaMessage(message: any, channelId: number, supabase: any, botToken: string) {
  const mediaItem = message.photo 
    ? message.photo[message.photo.length - 1] 
    : message.video || message.document;

  if (!mediaItem) return null;

  try {
    // Get file info from Telegram
    const fileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${mediaItem.file_id}`;
    const fileResponse = await fetch(fileUrl);
    const fileData = await fileResponse.json();

    if (!fileData.ok) {
      throw new Error(`Failed to get file path: ${JSON.stringify(fileData)}`);
    }

    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
    const fileContent = await (await fetch(downloadUrl)).arrayBuffer();
    
    const timestamp = Date.now();
    const fileExt = fileData.result.file_path.split('.').pop()?.toLowerCase() || 'unknown';
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
    const contentType = getContentType(safeFileName, mediaType);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketId)
      .upload(safeFileName, fileContent, {
        contentType,
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      if (uploadError.message.includes('duplicate')) {
        console.log(`File ${safeFileName} already exists, skipping upload`);
      } else {
        throw uploadError;
      }
    }

    const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucketId}/${safeFileName}`;

    // Prepare metadata
    const metadata = {
      file_id: mediaItem.file_id,
      file_unique_id: mediaItem.file_unique_id,
      file_size: mediaItem.file_size,
      message_id: message.message_id,
      content_type: contentType,
      mime_type: mediaType
    };

    // Get user info from auth context
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Insert into media table
    const { data: savedMedia, error: dbError } = await supabase
      .from('media')
      .insert({
        user_id: user.id,
        chat_id: channelId,
        file_name: safeFileName,
        file_url: publicUrl,
        media_type: mediaType,
        caption: message.caption,
        metadata,
        media_group_id: message.media_group_id,
        public_url: publicUrl
      })
      .select()
      .single();

    if (dbError) {
      // If it's a duplicate, we can ignore it
      if (dbError.code === '23505') {
        console.log(`Media record for ${safeFileName} already exists, skipping insert`);
        return null;
      }
      throw dbError;
    }

    return savedMedia;
  } catch (error) {
    console.error('Error in processMediaMessage:', error);
    throw error;
  }
}