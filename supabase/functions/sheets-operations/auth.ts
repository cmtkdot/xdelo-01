export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatPrivateKey(privateKey: string): string {
  try {
    let formattedKey = privateKey.replace(/\\n/g, '\n');
    formattedKey = formattedKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .trim();
    
    return `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
  } catch (error) {
    console.error('Error formatting private key:', error);
    throw new Error('Failed to format private key');
  }
}

export async function generateGoogleToken(credentials: any) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;

    const claim = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: exp,
      iat: now
    };

    const formattedPrivateKey = formatPrivateKey(credentials.private_key);
    console.log('Private key length:', formattedPrivateKey.length);

    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedClaim = btoa(JSON.stringify(claim));
    const signatureInput = `${encodedHeader}.${encodedClaim}`;

    const keyArrayBuffer = new TextEncoder().encode(formattedPrivateKey);
    const keyData = await crypto.subtle.importKey(
      'pkcs8',
      keyArrayBuffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      keyData,
      new TextEncoder().encode(signatureInput)
    );

    const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('Token response:', tokenData);
      throw new Error('Failed to obtain access token');
    }

    return tokenData.access_token;
  } catch (error) {
    console.error('Error in generateGoogleToken:', error);
    throw error;
  }
}