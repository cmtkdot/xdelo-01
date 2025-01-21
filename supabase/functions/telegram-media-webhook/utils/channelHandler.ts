import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const handleChannel = async (
  supabase: ReturnType<typeof createClient>,
  message: any
) => {
  try {
    if (!message.chat?.id) {
      throw new Error('No chat ID in message');
    }

    // Get bot info for default username
    const botInfo = await fetch(
      `https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/getMe`
    ).then(res => res.json());

    // Format username - remove @ if present and use bot username as default
    const username = message.chat.username 
      ? message.chat.username.startsWith('@') 
        ? message.chat.username.substring(1) 
        : message.chat.username
      : botInfo.result?.username || 'unknown_channel';

    const { data: existingChannel, error: selectError } = await supabase
      .from('channels')
      .select('*')
      .eq('chat_id', message.chat.id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    if (!existingChannel) {
      const { error: insertError } = await supabase
        .from('channels')
        .insert({
          chat_id: message.chat.id,
          title: message.chat.title || 'Unknown',
          username: username,
          user_id: message.from?.id ? message.from.id.toString() : 'system',
          is_active: true
        });

      if (insertError) {
        throw insertError;
      }

      console.log('[handleChannel] Created new channel record');
    } else {
      // Update existing channel if title or username changed
      if (existingChannel.title !== message.chat.title || existingChannel.username !== username) {
        const { error: updateError } = await supabase
          .from('channels')
          .update({
            title: message.chat.title,
            username: username,
            updated_at: new Date().toISOString()
          })
          .eq('chat_id', message.chat.id);

        if (updateError) {
          throw updateError;
        }

        console.log('[handleChannel] Updated channel record');
      }
    }
  } catch (error) {
    console.error('[handleChannel] Error:', error);
    throw error;
  }
};