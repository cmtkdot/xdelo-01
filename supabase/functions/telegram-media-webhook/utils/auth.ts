export const validateWebhookAuth = (
  authHeader: string | null,
  webhookSecret: string | null
): boolean => {
  if (!authHeader || !webhookSecret || authHeader !== webhookSecret) {
    console.error("Authentication failed - invalid or missing webhook secret");
    return false;
  }
  return true;
};

export const validateBotToken = (botToken: string | null): boolean => {
  if (!botToken) {
    console.error("Missing bot token");
    return false;
  }
  return true;
};

export const generateJWT = async (credentials: any): Promise<string> => {
  try {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: credentials.private_key_id
    };

    const now = Math.floor(Date.now() / 1000);
    const oneHour = 60 * 60;

    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + oneHour,
      iat: now
    };

    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));

    // Create signature input
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    // Convert private key to proper format
    const privateKey = credentials.private_key.replace(/\\n/g, '\n');

    // Create signature using RS256
    const encoder = new TextEncoder();
    const keyData = await crypto.subtle.importKey(
      'pkcs8',
      encoder.encode(privateKey),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      keyData,
      encoder.encode(signatureInput)
    );

    // Convert signature to base64
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Combine all parts
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  } catch (error) {
    console.error('Error generating JWT:', error);
    throw new Error(`Failed to generate JWT: ${error.message}`);
  }
};