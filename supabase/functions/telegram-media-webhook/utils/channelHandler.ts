import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const handleChannel = async (
  supabase: ReturnType<typeof createClient>,
  message: any
) => {
  try {
    if (!message.chat?.id) {
      throw new Error('No chat ID in message');
    }

    const { data: existingChannel, error: selectError } = await supabase
      .from('channels')
      .select('*')
      .eq('chat_id', message.chat.id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw selectError;
    }

    if (!existingChannel) {
      const { error: insertError } = await supabase
        .from('channels')
        .insert({
          chat_id: message.chat.id,
          title: message.chat.title || 'Unknown',
          username: message.chat.username,
          user_id: message.from?.id ? message.from.id.toString() : 'system',
          is_active: true
        });

      if (insertError) {
        throw insertError;
      }

      console.log('[handleChannel] Created new channel record');
    }
  } catch (error) {
    console.error('[handleChannel] Error:', error);
    throw error;
  }
};