import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    const { spreadsheetId, gid, data } = await req.json();
    console.log('Received request:', { spreadsheetId, gid });

    // Get service account credentials
    const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
    
    // Get access token using JWT
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: tokenEndpoint,
      exp: now + 3600,
      iat: now,
    };

    // Create JWT
    const header = { alg: 'RS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedClaim = btoa(JSON.stringify(claim));
    const signatureInput = `${encodedHeader}.${encodedClaim}`;
    
    // Sign JWT with private key
    const encoder = new TextEncoder();
    const privateKey = credentials.private_key;
    const keyData = await crypto.subtle.importKey(
      'pkcs8',
      new TextEncoder().encode(privateKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      keyData,
      encoder.encode(signatureInput)
    );
    
    const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const { access_token } = await tokenResponse.json();
    console.log('Obtained access token');

    // Update headers and data in Google Sheet
    const headers = [
      'File Name',
      'Type',
      'Channel',
      'Created At',
      'Caption',
      'Original File URL',
      'Google Drive URL',
      'Google Drive ID',
      'Last Updated',
      'Media Group ID',
      'Row ID',
      'Public URL'  // Added new column
    ];

    if (headers.length > 0) {
      const sheetsEndpoint = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${gid}!A1:${String.fromCharCode(65 + headers.length)}1`;
      
      // Update headers
      const headerResponse = await fetch(sheetsEndpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [headers],
          majorDimension: 'ROWS',
        }),
      });

      if (!headerResponse.ok) {
        throw new Error(`Failed to update headers: ${await headerResponse.text()}`);
      }
      console.log('Updated headers successfully');

      // Update data if provided
      if (data && data.length > 0) {
        const dataEndpoint = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${gid}!A2:${String.fromCharCode(65 + headers.length)}${data.length + 1}`;
        
        const dataResponse = await fetch(dataEndpoint, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: data,
            majorDimension: 'ROWS',
          }),
        });

        if (!dataResponse.ok) {
          throw new Error(`Failed to update data: ${await dataResponse.text()}`);
        }
        console.log('Updated data successfully');
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in sync-google-sheet function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
