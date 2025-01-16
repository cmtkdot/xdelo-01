import { saveChannel, saveMessage } from "./database.ts";
import { handleMediaUpload } from "../handlers/mediaHandler.ts";
import { logOperation } from "../../_shared/database.ts";

export async function processMessage(message: any, supabase: any) {
  if (!message?.chat?.id) {
    throw new Error('Invalid message format');
  }

  const userId = crypto.randomUUID();
  const results = {
    channel: null,
    message: null,
    media: null,
    isDuplicate: false
  };

  try {
    // Process channel with optimized error handling
    try {
      results.channel = await saveChannel(supabase, message.chat, userId);
      console.log('Channel processed:', results.channel);
    } catch (error) {
      console.error('Error processing channel:', error);
      await logOperation(supabase, 'telegram-media-webhook', 'error', `Channel processing error: ${error.message}`);
    }

    // Process message with optimized error handling
    try {
      results.message = await saveMessage(supabase, message.chat, message, userId);
      console.log('Message processed:', results.message);
    } catch (error) {
      console.error('Error processing message:', error);
      await logOperation(supabase, 'telegram-media-webhook', 'error', `Message processing error: ${error.message}`);
    }

    // Handle media if present with optimized processing
    if (message.photo?.length > 0 || message.video || message.document) {
      const mediaItem = message.photo 
        ? message.photo[message.photo.length - 1] 
        : message.video || message.document;

      // Check for existing media with optimized query
      const { data: existingMedia } = await supabase
        .from('media')
        .select('id, file_name, metadata')
        .eq('metadata->file_unique_id', mediaItem.file_unique_id)
        .single();

      if (existingMedia) {
        console.log(`Duplicate media detected with file_unique_id: ${mediaItem.file_unique_id}`);
        return {
          ...results,
          media: existingMedia,
          isDuplicate: true
        };
      }

      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (!botToken) {
        throw new Error('Telegram bot token not configured');
      }

      // Process media with optimized error handling
      try {
        results.media = await handleMediaUpload(supabase, message, userId, botToken);
        console.log('Media processed:', results.media);
      } catch (error) {
        console.error('Error processing media:', error);
        await logOperation(supabase, 'telegram-media-webhook', 'error', `Media processing error: ${error.message}`);
        throw error;
      }
    }

    await logOperation(
      supabase,
      'telegram-media-webhook',
      'success',
      `Successfully processed message ${message.message_id} from chat ${message.chat.id}`
    );

    return results;
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
}