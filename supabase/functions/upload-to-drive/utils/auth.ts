import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

export const generateServiceAccountToken = async (credentials: any) => {
  try {
    console.log('Starting service account token generation...');

    // Validate required credential fields
    if (!credentials) {
      throw new Error('Credentials object is undefined');
    }

    if (!credentials.client_email || !credentials.private_key) {
      console.error('Invalid credentials:', JSON.stringify(credentials, null, 2));
      throw new Error('Invalid credentials: missing client_email or private_key');
    }

    // Ensure private key is properly formatted
    const privateKey = credentials.private_key.replace(/\\n/g, '\n');
    console.log('Client email:', credentials.client_email);

    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: getNumericDate(3600),
      iat: now
    };

    // Create JWT with explicit algorithm configuration
    const jwt = await create(
      { alg: "RS256", typ: "JWT" },
      claims,
      privateKey
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
      console.error('Token exchange failed:', error);
      throw new Error(`Failed to get access token: ${error}`);
    }

    const data = await response.json();
    console.log('Successfully generated access token');
    return data.access_token;
  } catch (error) {
    console.error('Error generating service account token:', error);
    throw error;
  }
};