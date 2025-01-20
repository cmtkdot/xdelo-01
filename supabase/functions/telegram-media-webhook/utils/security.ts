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