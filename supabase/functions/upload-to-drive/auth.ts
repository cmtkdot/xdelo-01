export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function formatPrivateKey(privateKey: string): string {
  try {
    // Remove any existing headers, footers, and whitespace
    let formattedKey = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\\n/g, '')
      .replace(/\s/g, '');

    // Add proper PEM formatting
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
    
    return formattedKey;
  } catch (error) {
    console.error('Error formatting private key:', error);
    throw error;
  }
}

export async function generateServiceAccountToken(credentials: any) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // Token expires in 1 hour

    const claim = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: exp,
      iat: now
    };

    // Format the private key properly
    const formattedPrivateKey = formatPrivateKey(credentials.private_key);
    console.log('Formatted private key length:', formattedPrivateKey.length);

    // Create JWT header
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: credentials.private_key_id
    };

    // Base64 encode header and claim
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedClaim = btoa(JSON.stringify(claim));
    
    // Create signature input
    const signatureInput = `${encodedHeader}.${encodedClaim}`;

    try {
      // Convert the PEM formatted key to ArrayBuffer
      const keyArrayBuffer = base64ToArrayBuffer(
        formattedPrivateKey
          .replace(/-----BEGIN PRIVATE KEY-----\n/, '')
          .replace(/\n-----END PRIVATE KEY-----/, '')
      );

      // Import the private key
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

      // Sign the input
      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        keyData,
        new TextEncoder().encode(signatureInput)
      );

      // Create final JWT
      const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

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

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        console.error('Token response:', tokenData);
        throw new Error('Failed to obtain access token');
      }

      return tokenData.access_token;
    } catch (error) {
      console.error('Error during key import or signing:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in generateServiceAccountToken:', error);
    throw error;
  }
}