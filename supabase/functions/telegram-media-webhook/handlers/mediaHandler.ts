import { getContentType, getBucketId, generateSafeFileName } from "../utils/fileHandling.ts";

export const handleMediaUpload = async (
  supabase: any,
  message: any,
  userId: string,
  botToken: string
) => {
  if (!message) return null;

  const mediaItem = message.photo 
    ? message.photo[message.photo.length - 1] 
    : message.document || message.video;
  
  if (!mediaItem) {
    console.log('No media item found in message');
    return null;
  }

  try {
    // Get file information from Telegram
    const fileResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${mediaItem.file_id}`
    );
    const fileData = await fileResponse.json();

    if (!fileData.ok) {
      throw new Error(`Failed to get file path: ${JSON.stringify(fileData)}`);
    }

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    // Check for existing media
    const { data: existingMedia } = await supabase
      .from('media')
      .select('id')
      .eq('chat_id', message.chat.id)
      .eq('file_url', downloadUrl)
      .single();

    if (existingMedia) {
      console.log('Media already exists:', existingMedia);
      return { mediaData: existingMedia, exists: true };
    }

    // Prepare file metadata
    const fileExt = filePath.split('.').pop()?.toLowerCase();
    const timestamp = Date.now();
    const safeFileName = generateSafeFileName(
      `${mediaItem.file_unique_id}_${timestamp}`,
      fileExt || 'unknown'
    );

    const mediaType = message.document?.mime_type || 
      (message.photo ? 'image/jpeg' : message.video ? 'video/mp4' : 'application/octet-stream');

    // Download file
    const fileContent = await (await fetch(downloadUrl)).arrayBuffer();
    
    // Upload to storage
    const bucketId = getBucketId();
    const contentType = getContentType(safeFileName, mediaType);

    const { error: uploadError } = await supabase.storage
      .from(bucketId)
      .upload(safeFileName, fileContent, {
        contentType,
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    // Generate public URL and metadata
    const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucketId}/${safeFileName}`;
    const metadata = {
      file_id: mediaItem.file_id,
      file_unique_id: mediaItem.file_unique_id,
      file_size: mediaItem.file_size,
      message_id: message.message_id,
      media_group_id: message.media_group_id,
      content_type: contentType,
      mime_type: mediaType,
      original_file_path: filePath
    };

    // Save media record
    const { data: savedMedia, error: dbError } = await supabase
      .from('media')
      .insert([{
        user_id: userId,
        chat_id: message.chat.id,
        file_name: safeFileName,
        file_url: downloadUrl,
        media_type: mediaType,
        caption: message.caption,
        metadata,
        media_group_id: message.media_group_id,
        public_url: publicUrl
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    // Update message with media URLs
    await supabase
      .from('messages')
      .update({
        media_url: downloadUrl,
        public_url: publicUrl
      })
      .match({ chat_id: message.chat.id, message_id: message.message_id });

    return { mediaData: savedMedia, publicUrl };
  } catch (error) {
    console.error('Error in handleMediaUpload:', error);
    throw error;
  }
};