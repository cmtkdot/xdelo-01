import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { parseGoogleCredentials } from '../upload-to-drive/utils/credentials.ts';
import { generateServiceAccountToken } from '../upload-to-drive/utils/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting Google Sheets initialization...');
    const { spreadsheetId, gid, sheetName, headers } = await req.json();
    
    if (!spreadsheetId || !sheetName || !headers) {
      throw new Error('Missing required parameters: spreadsheetId, sheetName, or headers');
    }

    console.log('Request payload:', { spreadsheetId, gid, sheetName, headers });

    // Get credentials and access token
    const credentials = parseGoogleCredentials(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '');
    const accessToken = await generateServiceAccountToken(credentials);
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
    return new Response(
      JSON.stringify({ success: true }),
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