export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token',
};

export const validateWebhookSecret = (headers: Headers, webhookSecret: string): boolean => {
  // Get the secret token from the header
  const providedSecret = headers.get('x-telegram-bot-api-secret-token');
  
  console.log('[validateWebhookSecret] Starting webhook secret validation');
  
  if (!providedSecret) {
    console.error('[validateWebhookSecret] No secret token provided in headers');
    console.log('[validateWebhookSecret] Available headers:', Array.from(headers.keys()));
    return false;
  }

  if (!webhookSecret) {
    console.error('[validateWebhookSecret] No webhook secret configured in environment');
    return false;
  }

  const isValid = providedSecret === webhookSecret;
  console.log('[validateWebhookSecret] Secret validation result:', isValid ? 'success' : 'failed');
  
  return isValid;
};