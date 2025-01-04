import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { saveMedia } from "../utils/database.ts";
import { 
  generateSafeFileName, 
  determineMediaType, 
  getMediaItem,
  formatMediaMetadata,
  getContentType,
  generatePublicUrl
} from "../utils/fileHandling.ts";

export const handleMediaUpload = async (
  supabase: any,
  message: any,
  userId: string,
  botToken: string
) => {
  try {
    const mediaItem = message.photo 
      ? message.photo[message.photo.length - 1] 
      : getMediaItem(message);
    
    if (!mediaItem) {
      console.error('No media item found in message');
      return null;
    }

    const fileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${mediaItem.file_id}`;
    const fileResponse = await fetch(fileUrl);
    const fileData = await fileResponse.json();

    if (!fileData.ok) {
      throw new Error(`Failed to get file path: ${JSON.stringify(fileData)}`);
    }

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    
    // Get the file extension from the original file path
    const fileExt = filePath.split('.').pop()?.toLowerCase();
    const timestamp = Date.now();
    const safeFileName = generateSafeFileName(
      `${mediaItem.file_unique_id}_${timestamp}`,
      fileExt || 'unknown'
    );

    // Determine which bucket to use based on file type
    const bucketId = fileExt === 'mov' ? 'telegram-video' : 'telegram-media';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketId)
      .upload(safeFileName, await (await fetch(downloadUrl)).arrayBuffer(), {
        contentType: getContentType(safeFileName, determineMediaType(message)),
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    // Generate the correct public URL based on the bucket
    const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucketId}/${safeFileName}`;

    const mediaData = {
      user_id: userId,
      chat_id: message.chat.id,
      file_name: safeFileName,
      file_url: publicUrl,
      media_type: determineMediaType(message),
      caption: message.caption,
      metadata: {
        ...formatMediaMetadata(mediaItem, message),
        message_id: message.message_id,
        media_group_id: message.media_group_id
      },
      media_group_id: message.media_group_id,
    };

    const savedMedia = await saveMedia(
      supabase,
      mediaData.user_id,
      mediaData.chat_id,
      mediaData.file_name,
      mediaData.file_url,
      mediaData.media_type,
      mediaData.caption,
      mediaData.metadata,
      mediaData.media_group_id,
      null,
      null,
      publicUrl
    );

    return { mediaData, publicUrl };
  } catch (error) {
    console.error('Error in handleMediaUpload:', error);
    throw error;
  }
};