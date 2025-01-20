import { AuthError } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";

export const checkAuth = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;
    
    if (!session?.user) {
      return { isAuthenticated: false, user: null };
    }

    // Verify bot user link if exists
    const { data: botUser, error: botError } = await supabase
      .from('bot_users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (botError && !botError.message.includes('No rows found')) {
      console.error('Error fetching bot user:', botError);
    }

    return { 
      isAuthenticated: true, 
      user: session.user,
      botUser: botUser || null
    };
  } catch (error) {
    console.error('Auth check failed:', error);
    return { 
      isAuthenticated: false, 
      user: null, 
      error 
    };
  }
};

export const handleAuthError = (error: AuthError) => {
  if (error.message.includes('token_refresh_failed')) {
    return {
      title: "Session Expired",
      description: "Your session has expired. Please log in again.",
    };
  }

  if (error.message.includes('invalid_grant')) {
    return {
      title: "Authentication Failed",
      description: "Invalid credentials. Please try again.",
    };
  }

  return {
    title: "Error",
    description: error.message,
  };
};

export const linkTelegramUser = async (telegramUserId: string, username?: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('bot_users')
      .upsert({
        id: user.id,
        telegram_user_id: telegramUserId,
        username: username,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error linking Telegram user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const cleanupUserSession = async () => {
  try {
    // Clear any stored tokens or session data
    await supabase.auth.signOut();
    
    // Clear any local storage items related to the session
    localStorage.removeItem('telegram_auth');
    
    return { success: true };
  } catch (error) {
    console.error('Error cleaning up session:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};