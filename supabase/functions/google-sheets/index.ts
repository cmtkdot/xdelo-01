import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, spreadsheetId, data, headerMapping, gid } = await req.json();
    const apiKey = Deno.env.get('GOOGLE_API_KEY');

    if (!apiKey) {
      throw new Error('Google API key not configured');
    }

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    console.log(`Processing ${action} request for spreadsheet: ${spreadsheetId}`);

    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${gid ? `${gid}!` : ''}A1:ZZ`;

    switch (action) {
      case 'sync': {
        // Get existing sheet data first
        const getResponse = await fetch(`${sheetUrl}?key=${apiKey}`);
        
        if (!getResponse.ok) {
          throw new Error(`Failed to fetch sheet data: ${getResponse.statusText}`);
        }

        const existingData = await getResponse.json();
        const existingValues = existingData.values || [];
        const headers = existingValues[0] || [];

        // Prepare data for update
        const updatedValues = data.map(row => {
          const newRow = new Array(headers.length).fill('');
          Object.entries(headerMapping || {}).forEach(([sheetHeader, dbColumn]) => {
            const headerIndex = headers.indexOf(sheetHeader);
            if (headerIndex !== -1) {
              const value = row[dbColumn];
              newRow[headerIndex] = value !== null && value !== undefined ? String(value) : '';
            }
          });
          return newRow;
        });

        // Update only mapped columns
        const updateResponse = await fetch(
          `${sheetUrl}?valueInputOption=RAW&key=${apiKey}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              values: [headers, ...updatedValues],
              majorDimension: 'ROWS',
            })
          }
        );

        if (!updateResponse.ok) {
          throw new Error(`Failed to update sheet: ${updateResponse.statusText}`);
        }

        const result = await updateResponse.json();
        console.log('Sheet sync completed successfully');
        
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  } catch (error) {
    console.error('Error in google-sheets function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});