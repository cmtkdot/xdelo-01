import { saveChannel, saveMessage } from "./database.ts";
import { handleMediaUpload } from "../handlers/mediaHandler.ts";

export async function processMessage(message: any, supabase: any) {
  console.log('Processing message:', { messageId: message.message_id, chatId: message.chat.id });

  if (!message?.chat?.id) {
    console.log('Invalid message format:', message);
    throw new Error('Invalid message format');
  }

  const userId = crypto.randomUUID();

  try {
    // Process channel first
    const channelData = await saveChannel(supabase, message.chat, userId);
    console.log('Channel processed:', channelData);

    // Process message
    const messageData = await saveMessage(supabase, message.chat, message, userId);
    console.log('Message processed:', messageData);

    // Handle media if present
    let mediaData = null;
    if (message.photo?.length > 0 || message.video || message.document) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (!botToken) {
        throw new Error('Telegram bot token not configured');
      }

      mediaData = await handleMediaUpload(supabase, message, userId, botToken);
      console.log('Media processed:', mediaData);
    }

    return { channelData, messageData, mediaData };
  } catch (error) {
    console.error('Error in processMessage:', error);
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'telegram-media-webhook',
        status: 'error',
        message: `Error processing message: ${error.message}`
      });
    throw error;
  }
}