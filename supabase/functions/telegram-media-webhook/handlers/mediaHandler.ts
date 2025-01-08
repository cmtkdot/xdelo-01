import { getAndDownloadTelegramFile } from "../../_shared/telegram.ts";

export async function handleMediaUpload(supabase: any, message: any, userId: string, botToken: string) {
  try {
    // Get the media item
    const mediaItem = message.photo 
      ? message.photo[message.photo.length - 1] 
      : message.video || message.document;

    if (!mediaItem?.file_id) {
      console.log('No valid media found in message:', message);
      return null;
    }

    // Check for existing media
    const { data: existingMedia } = await supabase
      .from('media')
      .select('id')
      .eq('metadata->file_unique_id', mediaItem.file_unique_id)
      .single();

    if (existingMedia) {
      console.log('Media already exists:', existingMedia.id);
      return existingMedia;
    }

    // Download and process new media
    console.log('Downloading media:', mediaItem.file_id);
    const { buffer, filePath } = await getAndDownloadTelegramFile(mediaItem.file_id, botToken);
    
    const timestamp = Date.now();
    const fileName = `${mediaItem.file_unique_id}_${timestamp}.${filePath.split('.').pop() || 'unknown'}`;
    
    const mediaType = message.photo 
      ? 'image/jpeg' 
      : (message.video ? 'video/mp4' : 'application/octet-stream');

    // Check if file exists in storage
    const { data: existingFile } = await supabase.storage
      .from('telegram-media')
      .list('', {
        limit: 1,
        search: fileName
      });

    if (existingFile && existingFile.length > 0) {
      console.log('File already exists in storage:', fileName);
      return null;
    }

    // Upload to storage
    console.log('Uploading to storage:', fileName);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('telegram-media')
      .upload(fileName, buffer, {
        contentType: mediaType,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Generate public URL
    const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${fileName}`;

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

    const { data: mediaData, error: mediaError } = await supabase
      .from('media')
      .insert({
        user_id: userId,
        chat_id: message.chat.id,
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
      throw mediaError;
    }

    return mediaData;
  } catch (error) {
    console.error('Error in handleMediaUpload:', error);
    throw error;
  }
}