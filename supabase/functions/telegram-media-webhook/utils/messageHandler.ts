import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const createMessageRecord = async (
  supabase: ReturnType<typeof createClient>,
  message: any,
  mediaResult: any
) => {
  try {
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_id: message.chat.id,
        message_id: message.message_id,
        sender_name: message.from?.first_name || message.chat.title || 'Unknown',
        text: message.caption || message.text,
        user_id: message.from?.id ? message.from.id.toString() : 'system',
        media_type: mediaResult?.mediaType || null,
        media_url: mediaResult?.fileUrl || null,
        public_url: mediaResult?.publicUrl || null,
        created_at: new Date(message.date * 1000).toISOString()
      });

    if (messageError) {
      throw new Error(`Message insert error: ${messageError.message}`);
    }

    console.log('[createMessageRecord] Successfully created message record');
  } catch (error) {
    console.error('[createMessageRecord] Error:', error);
    throw error;
  }
};