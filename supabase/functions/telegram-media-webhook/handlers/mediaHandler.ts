import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  generateSafeFileName, 
  determineMediaType, 
  getMediaItem,
  formatMediaMetadata,
  generatePublicUrl 
} from "../utils/fileHandling.ts";
import { uploadToGoogleDrive } from "../utils/googleDrive.ts";
import { saveMedia } from "../utils/database.ts";

export const handleMediaUpload = async (
  supabase: any,
  message: any,
  userId: string,
  botToken: string
) => {
  const mediaType = determineMediaType(message);
  const mediaItem = getMediaItem(message);
  const metadata = formatMediaMetadata(mediaItem, message);
  const messageCaption = message.caption || message.text || null;
  
  const fileResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${mediaItem.file_id}`
  );
  const fileData = await fileResponse.json();
  
  if (!fileData.ok) {
    throw new Error("Failed to get file path from Telegram");
  }

  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
  const fileName = generateSafeFileName(messageCaption || mediaItem.file_id, fileData.result.file_path.split('.').pop());

  // Upload to Supabase Storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from("telegram-media")
    .upload(fileName, await (await fetch(fileUrl)).arrayBuffer(), {
      contentType: mediaItem.mime_type || 'application/octet-stream',
      upsert: true,
    });

  if (storageError) {
    throw storageError;
  }

  // Generate public URL
  const publicUrl = generatePublicUrl("telegram-media", fileName);

  // Upload to Google Drive with video conversion if needed
  let driveData;
  try {
    driveData = await uploadToGoogleDrive(publicUrl, fileName);
    console.log('Successfully uploaded to Google Drive:', driveData);
  } catch (error) {
    console.error('Failed to upload to Google Drive:', error);
  }

  // Save media with public URL
  const mediaData = await saveMedia(
    supabase,
    userId,
    message.chat.id,
    fileName,
    fileUrl,
    mediaType,
    messageCaption,
    metadata,
    message.media_group_id,
    driveData?.fileId,
    driveData?.webViewLink,
    publicUrl
  );

  return { mediaData, publicUrl };
};