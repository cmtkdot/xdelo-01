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

    // Get the access token from the request headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }
    const accessToken = authHeader.replace('Bearer ', '');

    console.log(`Processing ${action} request for spreadsheet: ${spreadsheetId}`);

    switch (action) {
      case 'init': {
        // Fetch sheet data using OAuth token
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
              'Authorization': `Bearer ${accessToken}`,
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