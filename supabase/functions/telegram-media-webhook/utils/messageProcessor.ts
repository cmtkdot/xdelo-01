import { saveChannel, saveMessage } from "./database.ts";
import { handleMediaUpload } from "../handlers/mediaHandler.ts";
import { updateCaption } from "../handlers/captionHandler.ts";

export const processMessage = async (message: any, supabase: any) => {
  const userId = crypto.randomUUID();
  let result = {
    channelData: null,
    messageData: null,
    mediaData: null
  };

  try {
    // Process channel first (lightweight operation)
    result.channelData = await saveChannel(supabase, message.chat, userId);
    console.log('Channel processed:', result.channelData);

    // Process message next (also lightweight)
    result.messageData = await saveMessage(supabase, message.chat, message, userId);
    console.log('Message processed:', result.messageData);

    // Handle media if present (heavier operation)
    if (message.photo || message.video || message.document) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (!botToken) {
        throw new Error('Telegram bot token not configured');
      }

      result.mediaData = await handleMediaUpload(supabase, message, userId, botToken);
      console.log('Media processed:', result.mediaData);
    }

    // Update captions if needed (lightweight operation)
    if (message.caption) {
      await updateCaption(supabase, message);
    }

    return result;
  } catch (error) {
    console.error('Error in processMessage:', error);
    throw error;
  }
};