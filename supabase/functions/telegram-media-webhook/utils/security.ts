export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const validateWebhookSecret = (headers: Headers, webhookSecret: string): boolean => {
  const providedSecret = headers.get('x-telegram-bot-api-secret-token');
  if (!providedSecret) {
    console.error('[validateWebhookSecret] No secret token provided');
    return false;
  }
  return providedSecret === webhookSecret;
};

export const validateUser = async (supabase: any, userId: string) => {
  try {
    const { data: user, error } = await supabase
      .from('bot_users')
      .select('*')
      .eq('telegram_user_id', userId)
      .single();

    if (error) throw error;
    return user;
  } catch (error) {
    console.error('[validateUser] Error:', error);
    return null;
  }
};