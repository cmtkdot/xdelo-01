import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

export const generateServiceAccountToken = async (credentials: any) => {
  try {
    console.log('Generating service account token...');

    if (!credentials?.client_email || !credentials?.private_key) {
      throw new Error('Invalid credentials: missing client_email or private_key');
    }

    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: getNumericDate(3600),
      iat: now
    };

    // Create JWT with proper algorithm configuration
    const key = credentials.private_key;
    const jwt = await create(
      { alg: "RS256", typ: "JWT" },
      claims,
      key
    );

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error generating service account token:', error);
    throw error;
  }
};