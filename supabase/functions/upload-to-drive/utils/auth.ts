import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

export const generateServiceAccountToken = async (credentials: any) => {
  try {
    console.log('Generating service account token...');
    
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: getNumericDate(3600),
      iat: now
    };

    const key = credentials.private_key;
    const alg = 'RS256';

    const jwt = await create({ alg, typ: 'JWT' }, claims, key);
    
    // Exchange JWT for access token
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

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    const { access_token } = await tokenResponse.json();
    return access_token;
  } catch (error) {
    console.error('Error generating service account token:', error);
    throw error;
  }
};