import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getTelegramFilePath(fileId: string, botToken: string): Promise<string> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get file info: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.ok || !data.result.file_path) {
    throw new Error('Failed to get file path from Telegram');
  }

  return data.result.file_path;
}

export async function extractMediaInfo(message: any) {
  const photo = message.photo?.[message.photo?.length - 1];
  const video = message.video;
  const document = message.document;
  const mediaItem = photo || video || document;

  if (!mediaItem) {
    return null;
  }

  return {
    file_id: mediaItem.file_id,
    file_unique_id: mediaItem.file_unique_id,
    mime_type: mediaItem.mime_type || 'image/jpeg',
    file_size: mediaItem.file_size
  };
}

export async function downloadTelegramFile(filePath: string, botToken: string): Promise<ArrayBuffer> {
  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  return await response.arrayBuffer();
}