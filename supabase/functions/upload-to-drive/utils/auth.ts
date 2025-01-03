import { parseGoogleCredentials } from './credentials.ts';

export const generateServiceAccountToken = async (credentials: any) => {
  try {
    const jwtHeader = {
      alg: 'RS256',
      typ: 'JWT',
      kid: credentials.private_key_id
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(jwtHeader));
    const claimB64 = btoa(JSON.stringify(jwtClaimSet));
    const signatureInput = `${headerB64}.${claimB64}`;

    const key = await crypto.subtle.importKey(
      'pkcs8',
      new Uint8Array(atob(credentials.private_key.replace(/-----[^-]*-----/g, '').replace(/\n/g, '')).split('').map(c => c.charCodeAt(0))),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      encoder.encode(signatureInput)
    );

    const jwt = `${headerB64}.${claimB64}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token response error:', errorData);
      throw new Error('Failed to get access token');
    }

    const { access_token } = await tokenResponse.json();
    return access_token;
  } catch (error) {
    console.error('Error generating service account token:', error);
    throw error;
  }
};