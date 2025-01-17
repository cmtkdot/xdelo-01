import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, action, data, headerMapping, gid } = await req.json();
    
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    // Get service account credentials from environment
    const credentialsStr = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_CREDENTIALS");
    if (!credentialsStr) {
      throw new Error('Google service account credentials not found');
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsStr);
      console.log('Successfully parsed service account credentials');
    } catch (e) {
      console.error('Error parsing service account credentials:', e);
      throw new Error('Invalid service account credentials format');
    }

    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Invalid service account credentials: missing required fields');
    }

    // Clean up private key - replace literal '\n' with actual newlines
    credentials.private_key = credentials.private_key
      .replace(/\\n/g, '\n')
      .replace(/["']/g, ''); // Remove any quotes

    console.log(`Processing ${action} request for spreadsheet: ${spreadsheetId}`);

    switch (action) {
      case 'init': {
        // Fetch sheet data using service account authentication
        const jwt = await createJWT(credentials);
        
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:ZZ1`,
          {
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error('Google Sheets API error:', error);
          throw new Error(`Failed to fetch sheet data: ${JSON.stringify(error, null, 2)}`);
        }

        const sheetData = await response.json();
        return new Response(
          JSON.stringify({ success: true, headers: sheetData.values?.[0] || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      case 'sync': {
        if (!data || !headerMapping) {
          throw new Error('Data and header mapping are required for sync');
        }

        const jwt = await createJWT(credentials);

        // Prepare the request body for updating the sheet
        const updateBody = {
          values: data,
          majorDimension: "ROWS"
        };

        // Use the sheet's gid if provided
        const sheetParam = gid ? `gid=${gid}` : '';
        
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:ZZ?${sheetParam}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateBody)
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error('Google Sheets API error:', error);
          throw new Error(`Failed to update sheet: ${JSON.stringify(error, null, 2)}`);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});

// Helper function to create JWT token for service account authentication
async function createJWT(credentials: any) {
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
  const input = encoder.encode(
    `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(claim))}`
  );

  try {
    // Convert private key to proper format
    const privateKey = credentials.private_key;
    
    const key = await crypto.subtle.importKey(
      'pkcs8',
      str2ab(privateKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      input
    );

    const jwt = `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(claim))}.${btoa(
      String.fromCharCode.apply(null, new Uint8Array(signature))
    )}`;

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
      const error = await tokenResponse.json();
      console.error('Token exchange error:', error);
      throw new Error('Failed to obtain access token');
    }

    const { access_token } = await tokenResponse.json();
    return access_token;
  } catch (error) {
    console.error('JWT creation error:', error);
    throw error;
  }
}

// Helper function to convert string to ArrayBuffer
function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}