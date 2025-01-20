export const validateWebhookSecret = (
  requestHeaders: Headers,
  webhookSecret: string
): boolean => {
  const secretHeader = requestHeaders.get('x-telegram-bot-api-secret-token');
  return secretHeader === webhookSecret;
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};