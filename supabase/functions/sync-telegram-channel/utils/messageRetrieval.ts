import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { uploadToStorage, generateSafeFileName } from "../../_shared/storage.ts";
import { getAndDownloadTelegramFile } from "../../_shared/telegram.ts";
import { logOperation } from "../../_shared/database.ts";

export async function getChannelHistory(botToken: string, channelId: number, offset = 0) {
  console.log(`[getChannelHistory] Starting fetch for channel ${channelId} with offset ${offset}`);
  
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getHistory`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: channelId,
        offset: offset,
        limit: 100
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Telegram API Error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });
    
    // If we get a 404, try alternative method
    if (response.status === 404) {
      return await getChannelMessagesAlternative(botToken, channelId, offset);
    }
    
    throw new Error(`Failed to fetch history: ${errorText}`);
  }

  const data = await response.json();
  return data.result || [];
}

async function getChannelMessagesAlternative(botToken: string, channelId: number, offset = 0) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getUpdates`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        offset: offset,
        limit: 100,
        timeout: 0,
        allowed_updates: ["channel_post", "message"]
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Alternative method failed: ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  return data.result
    .filter(update => 
      (update.channel_post?.chat.id === channelId) || 
      (update.message?.chat.id === channelId)
    )
    .map(update => update.channel_post || update.message)
    .filter(Boolean);
}

export async function processMessage(message: any, channelId: number, supabase: any, botToken: string) {
  try {
    const mediaItem = message.photo 
      ? message.photo[message.photo.length - 1] 
      : message.video || message.document;

    if (!mediaItem) return null;

    // Check if media already exists
    const { data: existingMedia } = await supabase
      .from('media')
      .select('id')
      .eq('metadata->file_unique_id', mediaItem.file_unique_id)
      .single();

    if (existingMedia) {
      console.log(`Media item already exists: ${existingMedia.id}`);
      return null;
    }

    // Download and process new media
    const { buffer, filePath } = await getAndDownloadTelegramFile(
      mediaItem.file_id,
      botToken
    );

    const timestamp = Date.now();
    const fileName = generateSafeFileName(
      `${mediaItem.file_unique_id}_${timestamp}`,
      filePath.split('.').pop() || 'unknown'
    );

    const mediaType = message.photo 
      ? 'image/jpeg' 
      : (message.video ? 'video/mp4' : 'application/octet-stream');

    const publicUrl = await uploadToStorage(
      supabase,
      fileName,
      buffer,
      mediaType
    );

    const metadata = {
      file_id: mediaItem.file_id,
      file_unique_id: mediaItem.file_unique_id,
      message_id: message.message_id,
      media_group_id: message.media_group_id,
      content_type: mediaType,
      mime_type: mediaType,
      file_size: mediaItem.file_size,
      file_path: filePath
    };

    // Create media record
    const { data: mediaData, error: mediaError } = await supabase
      .from('media')
      .insert({
        user_id: crypto.randomUUID(), // This should be replaced with actual user ID in production
        chat_id: channelId,
        file_name: fileName,
        file_url: publicUrl,
        media_type: mediaType,
        caption: message.caption,
        metadata,
        media_group_id: message.media_group_id,
        public_url: publicUrl
      })
      .select()
      .single();

    if (mediaError) throw mediaError;

    // Log bot activity
    await supabase
      .from('bot_activities')
      .insert({
        event_type: 'media_sync',
        chat_id: channelId,
        message_id: message.message_id,
        message_type: mediaType,
        details: {
          media_id: mediaData.id,
          file_name: fileName,
          sync_type: 'channel_history'
        }
      });

    return { mediaData, publicUrl };
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}

export async function getAllChannelMessages(botToken: string, channelId: number) {
  console.log(`[getAllChannelMessages] Starting message fetch for channel ${channelId}`);
  
  const messages = [];
  let offset = 0;
  let hasMore = true;
  
  // Get channel history
  while (hasMore) {
    try {
      console.log(`[getAllChannelMessages] Fetching batch at offset ${offset}`);
      const batch = await getChannelHistory(botToken, channelId, offset);
      
      if (!batch || batch.length === 0) {
        console.log(`[getAllChannelMessages] No more messages found at offset ${offset}`);
        hasMore = false;
        break;
      }
      
      console.log(`[getAllChannelMessages] Received batch of ${batch.length} messages`);
      messages.push(...batch);
      offset += batch.length;
      
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[getAllChannelMessages] Error fetching messages at offset ${offset}:`, error);
      hasMore = false;
    }
  }
  
  console.log(`[getAllChannelMessages] Completed fetch for channel ${channelId}. Total messages: ${messages.length}`);
  return messages;
}