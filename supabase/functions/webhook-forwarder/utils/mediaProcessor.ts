import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkFileUniqueId, calculateFileHash, checkContentHash } from "./duplicateDetection.ts";
import { deleteFromStorage } from "./storageManager.ts";
import { extractMediaInfo, getTelegramFilePath, downloadTelegramFile } from "./telegramHandler.ts";

export async function processMediaMessage(supabase: any, message: any, botToken: string) {
  console.log('Processing media message:', { message_id: message.message_id });

  const mediaInfo = await extractMediaInfo(message);
  if (!mediaInfo) {
    console.error('No media in message:', message);
    return { error: 'No media in message' };
  }

  // Check for duplicates by file_unique_id first
  const existingMedia = await checkFileUniqueId(supabase, mediaInfo.file_unique_id);
  if (existingMedia) {
    console.log('Duplicate media found by file_unique_id:', existingMedia.id);
    return { existingMedia };
  }

  // Get file path from Telegram
  const filePath = await getTelegramFilePath(mediaInfo.file_id, botToken);
  const fileBuffer = await downloadTelegramFile(filePath, botToken);
  
  // Calculate content hash
  const contentHash = await calculateFileHash(fileBuffer);
  
  // Check for content-based duplicates
  const contentDuplicate = await checkContentHash(supabase, contentHash);
  if (contentDuplicate) {
    console.log('Content-based duplicate found:', contentDuplicate.id);
    return { existingMedia: contentDuplicate };
  }

  // Generate safe filename
  const fileName = `${mediaInfo.file_unique_id}_${Date.now()}.${filePath.split('.').pop()}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('telegram-media')
    .upload(fileName, fileBuffer, {
      contentType: mediaInfo.mime_type,
      cacheControl: '3600'
    });

  if (uploadError) {
    console.error('Error uploading to storage:', uploadError);
    throw uploadError;
  }

  // Generate public URL
  const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${fileName}`;

  // Extract product info from caption if present
  const productInfo = extractProductInfo(message.caption || '');

  // Prepare metadata
  const mediaMetadata = {
    file_id: mediaInfo.file_id,
    file_unique_id: mediaInfo.file_unique_id,
    file_size: mediaInfo.file_size,
    message_id: message.message_id,
    content_type: mediaInfo.mime_type,
    media_group_id: message.media_group_id,
    content_hash: contentHash,
    original_message: message,
  };

  return {
    fileName,
    publicUrl,
    mediaMetadata,
    productInfo
  };
}

function extractProductInfo(caption: string) {
  if (!caption) return null;
  const regex = /^(.*?)\s*x\s*(\d+)\s*#([A-Z0-9]+)/;
  const matches = caption.match(regex);
  
  if (matches) {
    return {
      product_name: matches[1].trim(),
      units_available: parseInt(matches[2]),
      po_product_id: matches[3]
    };
  }
  return null;
}