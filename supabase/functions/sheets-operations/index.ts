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
    
    // Get the access token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization token provided');
    }
    const accessToken = authHeader.replace('Bearer ', '');

    console.log(`Processing ${action} request for spreadsheet: ${spreadsheetId}`);

    switch (action) {
      case 'verify': {
        // Test access by trying to get spreadsheet metadata
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to verify sheet access: ${JSON.stringify(error)}`);
        }

        const metadata = await response.json();
        return new Response(
          JSON.stringify({ success: true, metadata }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'read': {
        // Read sheet data
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:ZZ`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to read sheet data: ${JSON.stringify(error)}`);
        }

        const sheetData = await response.json();
        return new Response(
          JSON.stringify({ success: true, data: sheetData.values }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'write': {
        if (!data) {
          throw new Error('No data provided for write operation');
        }

        // Write data to sheet
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:ZZ?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
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
          throw new Error(`Failed to write sheet data: ${JSON.stringify(error)}`);
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
      }
    );
  }
});