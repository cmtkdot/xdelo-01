import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function handleChannelUpdate(
  supabase: ReturnType<typeof createClient>,
  message: any
) {
  try {
    const chat = message.chat;
    if (!chat || !chat.id) {
      return { error: 'Invalid chat data' };
    }

    // Check if channel exists
    const { data: existingChannel, error: fetchError } = await supabase
      .from('channels')
      .select('id')
      .eq('chat_id', chat.id)
      .maybeSingle();

    if (fetchError) {
      console.error('[handleChannelUpdate] Error fetching channel:', fetchError);
      return { error: fetchError.message };
    }

    if (!existingChannel) {
      // Insert new channel
      const { data: newChannel, error: insertError } = await supabase
        .from('channels')
        .insert({
          chat_id: chat.id,
          title: chat.title || `Channel ${chat.id}`,
          username: chat.username,
          user_id: message.from?.id ? message.from.id.toString() : null,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        console.error('[handleChannelUpdate] Error inserting channel:', insertError);
        return { error: insertError.message };
      }

      console.log('[handleChannelUpdate] Created new channel:', newChannel.id);
      return { channelId: newChannel.id };
    }

    // Update existing channel if needed
    const { error: updateError } = await supabase
      .from('channels')
      .update({
        title: chat.title,
        username: chat.username,
        updated_at: new Date().toISOString()
      })
      .eq('chat_id', chat.id);

    if (updateError) {
      console.error('[handleChannelUpdate] Error updating channel:', updateError);
      return { error: updateError.message };
    }

    return { channelId: existingChannel.id };
  } catch (error) {
    console.error('[handleChannelUpdate] Error:', error);
    return { error: error.message };
  }
}