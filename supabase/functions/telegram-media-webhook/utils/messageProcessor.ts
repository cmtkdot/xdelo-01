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
    // Process channel
    results.channel = await saveChannel(supabase, message.chat, userId);
    console.log('Channel processed:', results.channel);

    // Process message
    results.message = await saveMessage(supabase, message.chat, message, userId);
    console.log('Message processed:', results.message);

    // Handle media if present
    if (message.photo?.length > 0 || message.video || message.document) {
      const mediaItem = message.photo 
        ? message.photo[message.photo.length - 1] 
        : message.video || message.document;

      // Check for existing media with same file_unique_id
      const { data: existingMedia } = await supabase
        .from('media')
        .select('id, file_name, metadata')
        .eq('metadata->file_unique_id', mediaItem.file_unique_id)
        .single();

      if (existingMedia) {
        console.log(`Duplicate media detected with file_unique_id: ${mediaItem.file_unique_id}`);
        console.log(`Skipping upload for existing media with id: ${existingMedia.id}`);
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

      results.media = await handleMediaUpload(supabase, message, userId, botToken);
      console.log('Media processed:', results.media);
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