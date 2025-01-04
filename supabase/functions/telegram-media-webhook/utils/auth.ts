export const validateWebhookAuth = (authHeader: string | null, webhookSecret: string | undefined): boolean => {
  if (!webhookSecret) {
    console.error('Webhook secret is not configured');
    return false;
  }
  return authHeader === webhookSecret;
};

export const validateBotToken = (botToken: string | undefined): boolean => {
  if (!botToken) {
    console.error('Bot token is not configured');
    return false;
  }
  return true;
};