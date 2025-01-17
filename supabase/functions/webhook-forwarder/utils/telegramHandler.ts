import { TelegramFile } from "../../_shared/types.ts";

export async function extractMediaInfo(message: any) {
  console.log('[extractMediaInfo] Processing message:', message.message_id);
  
  const photo = message.photo?.[message.photo?.length - 1];
  const video = message.video;
  const document = message.document;
  const mediaItem = photo || video || document;

  if (!mediaItem) {
    console.log('[extractMediaInfo] No media found in message');
    return null;
  }

  return {
    file_id: mediaItem.file_id,
    file_unique_id: mediaItem.file_unique_id,
    mime_type: mediaItem.mime_type || 'image/jpeg',
    file_size: mediaItem.file_size,
    message_id: message.message_id,
    content_type: getMediaType(mediaItem)
  };
}

function getMediaType(mediaItem: any): string {
  if (mediaItem.mime_type?.startsWith('video/')) return 'video';
  if (mediaItem.mime_type?.startsWith('image/')) return 'image';
  return 'document';
}

export async function downloadTelegramFile(fileId: string, botToken: string): Promise<{ buffer: ArrayBuffer; filePath: string }> {
  console.log('[downloadTelegramFile] Getting file path for:', fileId);
  
  // Get file path
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

  // Download file
  const filePath = data.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const fileResponse = await fetch(downloadUrl);

  if (!fileResponse.ok) {
    throw new Error(`Failed to download file: ${fileResponse.statusText}`);
  }

  const buffer = await fileResponse.arrayBuffer();
  return { buffer, filePath };
}