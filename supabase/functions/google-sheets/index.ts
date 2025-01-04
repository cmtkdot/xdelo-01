import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGoogleApiKey } from "../_shared/google-auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = await getGoogleApiKey();
    console.log('Successfully retrieved Google API key');

    const { action, ...data } = await req.json();
    
    switch (action) {
      case 'init':
        return await handleInitSheet(apiKey, data);
      case 'sync':
        return await handleSyncSheet(apiKey, data);
      default:
        throw new Error('Invalid action specified');
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

async function handleInitSheet(apiKey: string, data: any) {
  console.log('Initializing Google Sheet:', data.spreadsheetId);
  
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${data.spreadsheetId}?key=${apiKey}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to initialize sheet: ${response.statusText}`);
    }

    const sheetData = await response.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        data: sheetData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error initializing sheet:', error);
    throw error;
  }
}

async function handleSyncSheet(apiKey: string, data: any) {
  console.log('Syncing Google Sheet:', data.spreadsheetId);
  
  try {
    const { spreadsheetId, values, range = 'A1', valueInputOption = 'RAW' } = data;

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=${valueInputOption}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range,
          values,
          majorDimension: 'ROWS',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to sync sheet: ${response.statusText}`);
    }

    const result = await response.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing sheet:', error);
    throw error;
  }
}