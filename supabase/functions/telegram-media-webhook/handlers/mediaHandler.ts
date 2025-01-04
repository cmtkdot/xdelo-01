import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { saveMedia } from "../utils/database.ts";
import { 
  generateSafeFileName, 
  determineMediaType, 
  getMediaItem,
  formatMediaMetadata,
  getContentType,
  generatePublicUrl,
  getBucketId
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

    const mediaType = determineMediaType(message);
    const bucketId = getBucketId(mediaType, fileExt);
    
    console.log('Uploading to bucket:', bucketId);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketId)
      .upload(safeFileName, await (await fetch(downloadUrl)).arrayBuffer(), {
        contentType: getContentType(safeFileName, mediaType),
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    const publicUrl = generatePublicUrl(bucketId, safeFileName);
    console.log('Generated public URL:', publicUrl);

    const metadata = formatMediaMetadata(mediaItem, message);
    console.log('Formatted metadata:', metadata);

    const mediaData = {
      user_id: userId,
      chat_id: message.chat.id,
      file_name: safeFileName,
      file_url: publicUrl,
      media_type: mediaType,
      caption: message.caption,
      metadata,
      media_group_id: message.media_group_id,
    };

    console.log('Saving media with data:', mediaData);

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