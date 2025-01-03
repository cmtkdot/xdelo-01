import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting Google Sheets initialization...');
    const { spreadsheetId, gid } = await req.json();
    
    if (!spreadsheetId) {
      throw new Error('Missing required parameter: spreadsheetId');
    }

    console.log('Request payload:', { spreadsheetId, gid });

    // Get credentials from environment
    const credentialsString = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentialsString) {
      throw new Error('Google service account credentials not found');
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsString);
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Invalid service account credentials format');
      }
    } catch (error) {
      console.error('Error parsing credentials:', error);
      throw new Error('Failed to parse service account credentials');
    }

    // Generate JWT token
    const token = await generateServiceAccountToken(credentials);
    console.log('Successfully obtained access token');

    // Get spreadsheet info to verify access
    let apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    if (gid) {
      // If GID is provided, get specific sheet info
      apiUrl = `${apiUrl}/sheets/${gid}`;
    }

    console.log('Fetching spreadsheet from:', apiUrl);
    
    const getResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error('Failed to get spreadsheet:', {
        status: getResponse.status,
        statusText: getResponse.statusText,
        error: errorText
      });
      throw new Error(`Failed to get spreadsheet: Status ${getResponse.status} - ${errorText}`);
    }

    const spreadsheetData = await getResponse.json();
    console.log('Successfully verified spreadsheet access');
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: spreadsheetData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function generateServiceAccountToken(credentials: any) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header));
  const claimB64 = btoa(JSON.stringify(claim));
  const payload = `${headerB64}.${claimB64}`;

  // Convert private key to proper format
  const privateKey = credentials.private_key.replace(/\\n/g, '\n');

  // Sign the payload
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    str2ab(privateKey),
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
    encoder.encode(payload)
  );

  const jwt = `${payload}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

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
    throw new Error(`Failed to get access token: ${await tokenResponse.text()}`);
  }

  const { access_token } = await tokenResponse.json();
  return access_token;
}

function str2ab(str: string): ArrayBuffer {
  // Remove PEM headers and footers and any whitespace
  const pemContents = str
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  // Decode base64
  const binary = atob(pemContents);
  const buffer = new ArrayBuffer(binary.length);
  const array = new Uint8Array(buffer);
  
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  
  return buffer;
}