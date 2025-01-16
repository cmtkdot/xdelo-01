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
  const { spreadsheetId, values, headerMapping } = data;
  console.log('Syncing Google Sheet:', spreadsheetId);
  
  try {
    // First, get existing sheet data to preserve non-synced columns
    const existingDataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:ZZ?key=${apiKey}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!existingDataResponse.ok) {
      throw new Error(`Failed to fetch existing data: ${existingDataResponse.statusText}`);
    }

    const existingData = await existingDataResponse.json();
    const existingValues = existingData.values || [];
    const headers = existingValues[0] || [];

    // Create a map of column indices for synced columns
    const syncedColumnIndices = new Map();
    Object.keys(headerMapping || {}).forEach(header => {
      const index = headers.indexOf(header);
      if (index !== -1) {
        syncedColumnIndices.set(index, true);
      }
    });

    // Merge new data with existing data, preserving non-synced columns
    const mergedValues = values.map((row: string[], rowIndex: number) => {
      const existingRow = existingValues[rowIndex + 1] || [];
      const mergedRow = [...existingRow];
      
      row.forEach((value: string, colIndex: number) => {
        if (syncedColumnIndices.has(colIndex)) {
          mergedRow[colIndex] = value;
        }
      });

      return mergedRow;
    });

    // Update the sheet with merged data
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:ZZ?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: mergedValues,
          majorDimension: 'ROWS',
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to sync sheet: ${updateResponse.statusText}`);
    }

    const result = await updateResponse.json();
    
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