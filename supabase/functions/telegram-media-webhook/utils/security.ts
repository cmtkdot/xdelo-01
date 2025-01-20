export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token',
};

export const validateWebhookSecret = (headers: Headers, webhookSecret: string): boolean => {
  const providedSecret = headers.get('x-telegram-bot-api-secret-token');
  
  if (!providedSecret) {
    console.error('[validateWebhookSecret] No secret token provided in headers');
    return false;
  }

  const isValid = providedSecret === webhookSecret;
  console.log('[validateWebhookSecret] Secret validation result:', isValid);
  
  return isValid;
};