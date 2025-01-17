import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatPrivateKey(privateKey: string): string {
  try {
    // Remove any escaped newlines and replace with actual newlines
    let formattedKey = privateKey.replace(/\\n/g, '\n');
    
    // Remove any existing headers and footers
    formattedKey = formattedKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .trim();
    
    // Add proper PEM formatting with newlines
    return `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
  } catch (error) {
    console.error('Error formatting private key:', error);
    throw new Error('Failed to format private key');
  }
}

async function generateGoogleToken(credentials: any) {
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

    try {
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
      console.error('Error during key import or signing:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in generateGoogleToken:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, spreadsheetId, data } = await req.json();
    
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    // Get Google API key from the get-google-api-key function
    const apiKeyResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-google-api-key`,
      {
        headers: {
          Authorization: req.headers.get('Authorization') || '',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!apiKeyResponse.ok) {
      throw new Error('Failed to get Google API key');
    }

    const { api_key } = await apiKeyResponse.json();
    
    // Get service account credentials
    const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
    if (!credentials.private_key || !credentials.client_email) {
      throw new Error('Invalid service account credentials');
    }
    
    console.log(`Processing ${action} request for spreadsheet: ${spreadsheetId}`);

    // Generate JWT token
    const token = await generateGoogleToken(credentials);
    
    switch (action) {
      case 'verify': {
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${api_key}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error('Verification failed:', error);
          throw new Error(`Failed to verify sheet access: ${JSON.stringify(error)}`);
        }

        const metadata = await response.json();
        return new Response(
          JSON.stringify({ success: true, metadata }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'write': {
        if (!data) {
          throw new Error('No data provided for write operation');
        }

        const metadataResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${api_key}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!metadataResponse.ok) {
          throw new Error('Failed to get spreadsheet metadata');
        }

        const metadata = await metadataResponse.json();
        const sheet = metadata.sheets[0];
        const sheetId = sheet.properties.sheetId;

        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW&key=${api_key}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: data,
              majorDimension: "ROWS"
            })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error('Write failed:', error);
          throw new Error(`Failed to write data: ${JSON.stringify(error)}`);
        }

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate?key=${api_key}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [{
                autoResizeDimensions: {
                  dimensions: {
                    sheetId: sheetId,
                    dimension: "COLUMNS",
                    startIndex: 0,
                    endIndex: data[0].length
                  }
                }
              }]
            })
          }
        );

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
      }
    );
  }
});