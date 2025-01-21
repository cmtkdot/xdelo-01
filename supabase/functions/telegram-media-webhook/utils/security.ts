export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token',
};

export const validateWebhookSecret = async (secret: string | null): Promise<boolean> => {
  const expectedSecret = "9d1b07076d9dde382c48538220d8a629a5242b5c12adb2d4a76efe147a3a1a5a";
  
  console.log('[validateWebhookSecret] Starting webhook secret validation');
  
  if (!secret) {
    console.error('[validateWebhookSecret] No secret provided in request');
    return false;
  }

  const isValid = secret === expectedSecret;
  console.log('[validateWebhookSecret] Secret validation result:', isValid ? 'success' : 'failed');
  console.log('[validateWebhookSecret] Provided secret:', secret);
  
  return isValid;
};