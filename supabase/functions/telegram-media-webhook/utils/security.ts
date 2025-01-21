export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token',
};

export const validateWebhookSecret = async (secret: string | null): Promise<boolean> => {
  const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  
  console.log('[validateWebhookSecret] Starting webhook secret validation');
  
  if (!secret) {
    console.error('[validateWebhookSecret] No secret provided in request');
    return false;
  }

  if (!webhookSecret) {
    console.error('[validateWebhookSecret] No webhook secret configured in environment');
    return false;
  }

  const isValid = secret === webhookSecret;
  console.log('[validateWebhookSecret] Secret validation result:', isValid ? 'success' : 'failed');
  
  return isValid;
};