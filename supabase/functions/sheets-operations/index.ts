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
    const { action, spreadsheetId, data } = await req.json();
    
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    // Get service account credentials from environment
    const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
    
    console.log(`Processing ${action} request for spreadsheet: ${spreadsheetId}`);

    // Generate JWT token
    const token = await generateGoogleToken(credentials);
    
    switch (action) {
      case 'verify': {
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
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

        // First, get the current sheet metadata
        const metadataResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
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
        const sheet = metadata.sheets[0]; // Use first sheet
        const sheetId = sheet.properties.sheetId;

        // Write data
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW`,
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

        // Auto-resize columns
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
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

async function generateGoogleToken(credentials: any) {
  try {
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    // Clean and format the private key
    const privateKey = credentials.private_key
      .replace(/\\n/g, '\n')
      .replace(/["']/g, '')
      .trim();

    // Create the JWT segments
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedClaim = btoa(JSON.stringify(claim));
    const signatureInput = `${encodedHeader}.${encodedClaim}`;

    // Import the private key with proper format
    const binaryKey = new TextEncoder().encode(privateKey);
    
    try {
      // Import the key for signing
      const keyData = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
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

      // Create the complete JWT
      const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
      const jwt = `${encodedHeader}.${encodedClaim}.${encodedSignature}`;

      // Exchange JWT for access token
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
        const error = await tokenResponse.json();
        console.error('Token exchange failed:', error);
        throw new Error(`Failed to exchange JWT for access token: ${JSON.stringify(error)}`);
      }

      const tokenData = await tokenResponse.json();
      return tokenData.access_token;
    } catch (error) {
      console.error('Error in key operations:', error);
      throw new Error(`Failed to process private key: ${error.message}`);
    }
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error(`Failed to generate Google token: ${error.message}`);
  }
}