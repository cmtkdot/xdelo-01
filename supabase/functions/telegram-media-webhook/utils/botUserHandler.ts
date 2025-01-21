import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const handleBotUser = async (
  supabase: ReturnType<typeof createClient>,
  message: any
) => {
  try {
    if (!message.from?.id) {
      throw new Error('No user ID in message');
    }

    // Format username - remove @ if present
    const username = message.from.username 
      ? message.from.username.startsWith('@') 
        ? message.from.username.substring(1) 
        : message.from.username
      : null;

    const { data: existingUser, error: selectError } = await supabase
      .from('bot_users')
      .select('*')
      .eq('telegram_user_id', message.from.id.toString())
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    if (!existingUser) {
      const { error: insertError } = await supabase
        .from('bot_users')
        .insert({
          telegram_user_id: message.from.id.toString(),
          username: username,
          first_name: message.from.first_name,
          last_name: message.from.last_name
        });

      if (insertError) {
        throw insertError;
      }

      console.log('[handleBotUser] Created new bot user record');
    } else {
      // Update existing user if any details changed
      if (
        existingUser.username !== username ||
        existingUser.first_name !== message.from.first_name ||
        existingUser.last_name !== message.from.last_name
      ) {
        const { error: updateError } = await supabase
          .from('bot_users')
          .update({
            username: username,
            first_name: message.from.first_name,
            last_name: message.from.last_name,
            updated_at: new Date().toISOString()
          })
          .eq('telegram_user_id', message.from.id.toString());

        if (updateError) {
          throw updateError;
        }

        console.log('[handleBotUser] Updated bot user record');
      }
    }
  } catch (error) {
    console.error('[handleBotUser] Error:', error);
    throw error;
  }
};