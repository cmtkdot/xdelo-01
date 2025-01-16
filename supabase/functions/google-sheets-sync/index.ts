import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, action, accessToken } = await req.json();
    
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    console.log(`Processing ${action} request for spreadsheet: ${spreadsheetId}`);

    switch (action) {
      case 'init': {
        // Fetch sheet data using the access token
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:ZZ1`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error('Google Sheets API error:', error);
          throw new Error(`Failed to fetch sheet data: ${JSON.stringify(error, null, 2)}`);
        }

        const data = await response.json();
        return new Response(
          JSON.stringify({ success: true, headers: data.values?.[0] || [] }),
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