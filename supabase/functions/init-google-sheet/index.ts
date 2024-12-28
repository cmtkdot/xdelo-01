import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateJWT() {
  const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
  
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: credentials.private_key_id
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '');
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, '');
  
  const signatureInput = encoder.encode(`${headerB64}.${claimB64}`);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    new TextEncoder().encode(credentials.private_key),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    signatureInput
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${claimB64}.${signatureB64}`;
}

async function getAccessToken() {
  const jwt = await generateJWT();
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

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting Google Sheets initialization...');
    const { spreadsheetId, gid, sheetName, headers } = await req.json();
    console.log('Request payload:', { spreadsheetId, gid, sheetName, headers });

    const accessToken = await getAccessToken();
    console.log('Successfully obtained access token');

    // Get spreadsheet info
    const getResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!getResponse.ok) {
      throw new Error(`Failed to get spreadsheet: ${await getResponse.text()}`);
    }

    const spreadsheet = await getResponse.json();
    console.log('Retrieved spreadsheet info');

    let targetSheet = spreadsheet.sheets?.find(
      (s: any) => s.properties?.sheetId === (gid ? parseInt(gid) : undefined)
    );

    if (!targetSheet) {
      console.log('Target sheet not found, creating new sheet...');
      const addSheetResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                  sheetId: gid ? parseInt(gid) : undefined
                }
              }
            }]
          })
        }
      );

      if (!addSheetResponse.ok) {
        throw new Error(`Failed to add sheet: ${await addSheetResponse.text()}`);
      }
      console.log('New sheet created successfully');
    }

    // Update headers
    console.log('Updating headers...');
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:${String.fromCharCode(65 + headers.length)}1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [headers]
        })
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to update headers: ${await updateResponse.text()}`);
    }

    console.log('Headers updated successfully');
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});