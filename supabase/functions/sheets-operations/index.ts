import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, generateGoogleToken } from "./auth.ts";
import { verifySheetAccess, writeToSheet } from "./sheets.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, spreadsheetId, data } = await req.json();
    
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    // Get Google API key from the get-google-api-key function
    const apiKeyResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-google-api-key`,
      {
        headers: {
          Authorization: req.headers.get('Authorization') || '',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!apiKeyResponse.ok) {
      throw new Error('Failed to get Google API key');
    }

    const { api_key } = await apiKeyResponse.json();
    
    // Get service account credentials
    const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
    if (!credentials.private_key || !credentials.client_email) {
      throw new Error('Invalid service account credentials');
    }
    
    console.log(`Processing ${action} request for spreadsheet: ${spreadsheetId}`);

    // Generate JWT token
    const token = await generateGoogleToken(credentials);
    
    switch (action) {
      case 'verify': {
        const metadata = await verifySheetAccess(spreadsheetId, token, api_key);
        return new Response(
          JSON.stringify({ success: true, metadata }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'write': {
        if (!data) {
          throw new Error('No data provided for write operation');
        }

        const metadata = await verifySheetAccess(spreadsheetId, token, api_key);
        const sheet = metadata.sheets[0];
        const sheetId = sheet.properties.sheetId;

        await writeToSheet(spreadsheetId, token, api_key, data, sheetId);

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