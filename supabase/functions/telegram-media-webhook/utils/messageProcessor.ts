import { saveChannel, saveMessage } from "./database.ts";
import { handleMediaUpload } from "../handlers/mediaHandler.ts";
import { updateCaption } from "../handlers/captionHandler.ts";

export const processMessage = async (message: any, supabase: any) => {
  // Generate a stable UUID for the user
  const userId = crypto.randomUUID();
  
  // Initialize result object with null values
  const result = {
    channelData: null,
    messageData: null,
    mediaData: null
  };

  try {
    // Basic validation to prevent unnecessary processing
    if (!message || !message.chat) {
      console.log('Invalid message format:', message);
      return result;
    }

    // Process channel (lightweight operation)
    try {
      result.channelData = await saveChannel(supabase, message.chat, userId);
      console.log('Channel processed:', result.channelData?.id);
    } catch (error) {
      console.error('Error saving channel:', error);
      // Continue processing even if channel save fails
    }

    // Process message (lightweight operation)
    try {
      result.messageData = await saveMessage(supabase, message.chat, message, userId);
      console.log('Message processed:', result.messageData?.id);
    } catch (error) {
      console.error('Error saving message:', error);
      // Continue processing even if message save fails
    }

    // Handle media if present (heavier operation)
    if (message.photo?.length > 0 || message.video || message.document) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (!botToken) {
        throw new Error('Telegram bot token not configured');
      }

      try {
        result.mediaData = await handleMediaUpload(supabase, message, userId, botToken);
        console.log('Media processed:', result.mediaData?.id);
      } catch (error) {
        console.error('Error processing media:', error);
        // Continue processing even if media upload fails
      }
    }

    // Update captions if needed (lightweight operation)
    if (message.caption && result.mediaData?.id) {
      try {
        await updateCaption(supabase, message);
        console.log('Caption updated for media:', result.mediaData.id);
      } catch (error) {
        console.error('Error updating caption:', error);
        // Continue processing even if caption update fails
      }
    }

    return result;
  } catch (error) {
    console.error('Error in processMessage:', error);
    throw error;
  }
};