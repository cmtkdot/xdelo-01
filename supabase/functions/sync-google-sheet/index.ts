import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { google } from 'https://deno.land/x/google_auth@v0.8.2/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, gid, sheetName, headers, data } = await req.json();

    // Initialize Google Sheets API with service account
    const serviceAccountCreds = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCreds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Update headers and data
    if (headers.length > 0) {
      // Update headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:${String.fromCharCode(65 + headers.length)}1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });

      // Update data
      if (data.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A2:${String.fromCharCode(65 + headers.length)}${data.length + 1}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: data
          }
        });
      }
    }

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