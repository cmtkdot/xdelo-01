import { saveChannel, saveMessage } from "./database.ts";
import { handleMediaUpload } from "../handlers/mediaHandler.ts";
import { updateCaption } from "../handlers/captionHandler.ts";
import { logOperation } from "../../_shared/database.ts";

const validateMessage = (message: any) => {
  if (!message || !message.chat) {
    console.log('Invalid message format:', message);
    return false;
  }
  return true;
};

export const processMessage = async (message: any, supabase: any) => {
  const userId = crypto.randomUUID();
  console.log('Processing message:', { messageId: message?.message_id, chatId: message?.chat?.id });

  if (!validateMessage(message)) {
    return { channelData: null, messageData: null, mediaData: null };
  }

  try {
    // Process channel
    const channelData = await saveChannel(supabase, message.chat, userId);
    console.log('Channel processed:', channelData?.id);

    // Process message
    const messageData = await saveMessage(supabase, message.chat, message, userId);
    console.log('Message processed:', messageData?.id);

    // Handle media if present
    let mediaData = null;
    if (message.photo?.length > 0 || message.video || message.document) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (!botToken) {
        throw new Error('Telegram bot token not configured');
      }

      mediaData = await handleMediaUpload(supabase, message, userId, botToken);
      console.log('Media processed:', mediaData?.id);

      // Update captions if needed
      if (message.caption && mediaData?.id) {
        await updateCaption(supabase, message);
        console.log('Caption updated for media:', mediaData.id);
      }
    }

    return { channelData, messageData, mediaData };
  } catch (error) {
    console.error('Error in processMessage:', error);
    await logOperation(
      supabase,
      'telegram-media-webhook',
      'error',
      `Error processing message: ${error.message}`
    );
    throw error;
  }
};