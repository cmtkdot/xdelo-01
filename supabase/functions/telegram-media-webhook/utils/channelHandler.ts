import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const handleChannel = async (
  supabase: ReturnType<typeof createClient>,
  message: any
) => {
  console.log("[handleChannel] Processing channel:", message.chat.id);

  const { data: existingChannel, error: channelError } = await supabase
    .from('channels')
    .select('id')
    .eq('chat_id', message.chat.id)
    .maybeSingle();

  if (channelError) {
    throw new Error(`Channel fetch error: ${channelError.message}`);
  }

  if (!existingChannel) {
    const { error: insertError } = await supabase
      .from('channels')
      .insert({
        chat_id: message.chat.id,
        title: message.chat.title || `Channel ${message.chat.id}`,
        username: message.chat.username,
        user_id: message.from?.id ? message.from.id.toString() : 'system',
        is_active: true
      });

    if (insertError) {
      throw new Error(`Channel insert error: ${insertError.message}`);
    }
  }

  return existingChannel;
};