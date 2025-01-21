export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token',
};

export const validateWebhookSecret = (headers: Headers, webhookSecret: string): boolean => {
  // Simple token validation - just check if it exists and matches
  const providedSecret = headers.get('x-telegram-bot-api-secret-token');
  
  if (!providedSecret) {
    console.error('[validateWebhookSecret] No secret token provided');
    return false;
  }

  const isValid = providedSecret === webhookSecret;
  console.log('[validateWebhookSecret] Secret validation:', isValid ? 'success' : 'failed');
  
  return isValid;
};