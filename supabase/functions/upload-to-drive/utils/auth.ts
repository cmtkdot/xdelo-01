import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

export const generateServiceAccountToken = async (credentials: any) => {
  try {
    console.log('Generating service account token...');
    
    const now = Math.floor(Date.now() / 1000);
    const clientEmail = credentials.client_email;
    const privateKey = credentials.private_key;
    
    if (!clientEmail || !privateKey) {
      throw new Error('Missing required credential fields');
    }

    const jwtPayload = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: getNumericDate(3600), // 1 hour from now
      iat: getNumericDate(0)
    };

    // Create JWT
    const jwt = await create(
      { alg: "RS256", typ: "JWT" },
      jwtPayload,
      privateKey
    );

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
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      throw new Error(`Failed to exchange JWT: ${error}`);
    }

    const { access_token } = await tokenResponse.json();
    return access_token;
  } catch (error) {
    console.error('Error generating service account token:', error);
    throw error;
  }
};