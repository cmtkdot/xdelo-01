import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkFileUniqueId, calculateFileHash, checkContentHash } from "./duplicateDetection.ts";
import { downloadTelegramFile, extractMediaInfo } from "./telegramHandler.ts";
import { deleteFromStorage } from "./storageManager.ts";

export async function processMediaMessage(supabase: any, message: any, botToken: string) {
  console.log('[processMediaMessage] Processing message:', message.message_id);

  // Extract media info
  const mediaInfo = await extractMediaInfo(message);
  if (!mediaInfo) {
    console.log('[processMediaMessage] No media in message');
    return { error: 'No media in message' };
  }

  // Check for duplicates by file_unique_id first - this is the fastest check
  console.log('[processMediaMessage] Checking for duplicates by file_unique_id:', mediaInfo.file_unique_id);
  try {
    const existingMedia = await checkFileUniqueId(supabase, mediaInfo.file_unique_id);
    
    if (existingMedia) {
      console.log('[processMediaMessage] Duplicate found by file_unique_id:', existingMedia.id);
      return { 
        isDuplicate: true,
        existingMedia,
        message: 'Media already exists in database'
      };
    }
  } catch (error) {
    console.error('[processMediaMessage] Error checking for duplicates:', error);
    return {
      error: 'Error checking for duplicates',
      details: error.message
    };
  }

  // Only download file if no duplicate found
  console.log('[processMediaMessage] No duplicate found, downloading file');
  try {
    const { buffer, filePath } = await downloadTelegramFile(mediaInfo.file_id, botToken);
    
    // Calculate content hash
    const contentHash = await calculateFileHash(buffer);
    console.log('[processMediaMessage] Calculated content hash:', contentHash);
    
    // Check for content-based duplicates
    const contentDuplicate = await checkContentHash(supabase, contentHash);
    if (contentDuplicate) {
      console.log('[processMediaMessage] Content-based duplicate found:', contentDuplicate.id);
      return { 
        isDuplicate: true,
        existingMedia: contentDuplicate,
        message: 'Content duplicate found'
      };
    }

    // Generate safe filename
    const fileName = `${mediaInfo.file_unique_id}_${Date.now()}.${filePath.split('.').pop()}`;

    // Upload to storage
    console.log('[processMediaMessage] Uploading new file:', fileName);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('telegram-media')
      .upload(fileName, buffer, {
        contentType: mediaInfo.mime_type,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('[processMediaMessage] Error uploading to storage:', uploadError);
      throw uploadError;
    }

    // Generate public URL
    const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${fileName}`;

    // Extract product info from caption
    const productInfo = extractProductInfo(message.caption || '');

    // Prepare metadata
    const mediaMetadata = {
      ...mediaInfo,
      content_hash: contentHash,
      processing_timestamp: new Date().toISOString()
    };

    return {
      fileName,
      publicUrl,
      mediaMetadata,
      productInfo,
      isDuplicate: false
    };
  } catch (error) {
    console.error('[processMediaMessage] Error processing media:', error);
    return {
      error: 'Error processing media',
      details: error.message
    };
  }
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