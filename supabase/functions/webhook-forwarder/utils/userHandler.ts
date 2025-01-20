import { SupabaseClient } from "@supabase/supabase-js";

export async function handleUserUpdate(
  supabase: SupabaseClient,
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

    if (!existingUser) {
      // Insert new user
      const { error: insertError } = await supabase
        .from('bot_users')
        .insert({
          telegram_user_id: user.id.toString(),
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name
        });

      if (insertError) {
        console.error('[handleUserUpdate] Error inserting user:', insertError);
        return { error: insertError.message };
      }

      console.log('[handleUserUpdate] Created new bot user:', user.id);
      return { success: true };
    }

    // Update existing user
    const { error: updateError } = await supabase
      .from('bot_users')
      .update({
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_user_id', user.id.toString());

    if (updateError) {
      console.error('[handleUserUpdate] Error updating user:', updateError);
      return { error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[handleUserUpdate] Error:', error);
    return { error: error.message };
  }
}