import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function handleUserUpdate(
  supabase: ReturnType<typeof createClient>,
  user: any
) {
  try {
    if (!user || !user.id) {
      return { error: 'Invalid user data' };
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('bot_users')
      .select('id')
      .eq('telegram_user_id', user.id.toString())
      .maybeSingle();

    if (fetchError) {
      console.error('[handleUserUpdate] Error fetching user:', fetchError);
      return { error: fetchError.message };
    }

    const userData = {
      telegram_user_id: user.id.toString(),
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      updated_at: new Date().toISOString()
    };

    if (!existingUser) {
      // Insert new user
      const { data: newUser, error: insertError } = await supabase
        .from('bot_users')
        .insert(userData)
        .select()
        .single();

      if (insertError) {
        console.error('[handleUserUpdate] Error inserting user:', insertError);
        return { error: insertError.message };
      }

      console.log('[handleUserUpdate] Created new user:', newUser.id);
      return { userId: newUser.id };
    }

    // Update existing user
    const { error: updateError } = await supabase
      .from('bot_users')
      .update(userData)
      .eq('telegram_user_id', user.id.toString());

    if (updateError) {
      console.error('[handleUserUpdate] Error updating user:', updateError);
      return { error: updateError.message };
    }

    return { userId: existingUser.id };
  } catch (error) {
    console.error('[handleUserUpdate] Error:', error);
    return { error: error.message };
  }
}