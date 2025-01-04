import { getContentType, getBucketId, generateSafeFileName } from "../utils/fileHandling.ts";

export const handleMediaUpload = async (
  supabase: any,
  message: any,
  userId: string,
  botToken: string
) => {
  try {
    const mediaItem = message.photo 
      ? message.photo[message.photo.length - 1] 
      : message.document || message.video;
    
    if (!mediaItem) {
      console.error('No media item found in message');
      return null;
    }

    console.log('Processing media item:', { mediaItem, message });

    const fileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${mediaItem.file_id}`;
    const fileResponse = await fetch(fileUrl);
    const fileData = await fileResponse.json();

    if (!fileData.ok) {
      console.error('Failed to get file data:', fileData);
      throw new Error(`Failed to get file path: ${JSON.stringify(fileData)}`);
    }

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    
    const fileExt = filePath.split('.').pop()?.toLowerCase();
    const timestamp = Date.now();
    const safeFileName = generateSafeFileName(
      `${mediaItem.file_unique_id}_${timestamp}`,
      fileExt || 'unknown'
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

    // Fetch the file content
    const fileContent = await (await fetch(downloadUrl)).arrayBuffer();

    // Check if media with same file_url already exists for this chat
    const { data: existingMedia } = await supabase
      .from('media')
      .select('id')
      .eq('chat_id', message.chat.id)
      .eq('file_url', downloadUrl)
      .single();

    if (existingMedia) {
      console.log('Media already exists:', existingMedia);
      return null;
    }

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
      original_file_path: filePath
    };

    // Insert into media table
    const mediaData = {
      user_id: userId,
      chat_id: message.chat.id,
      file_name: safeFileName,
      file_url: downloadUrl,
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
    console.error('Error in handleMediaUpload:', error);
    throw error;
  }
};