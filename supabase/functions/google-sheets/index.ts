import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID = "241566560647-0ovscpbnp0r9767brrb14dv6gjfq5uc4.apps.googleusercontent.com";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { spreadsheetId, range, values, operation } = await req.json();
    
    // Get the client secret from environment variables
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!clientSecret) {
      throw new Error('Google client secret not configured');
    }

    const accessToken = await getAccessToken(GOOGLE_CLIENT_ID, clientSecret);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let response;
    const sheetsEndpoint = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

    switch (operation) {
      case 'get':
        response = await fetch(sheetsEndpoint, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        break;

      case 'update':
        response = await fetch(sheetsEndpoint, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values,
            majorDimension: 'ROWS',
          }),
        });
        break;

      case 'append':
        response = await fetch(`${sheetsEndpoint}:append`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values,
            majorDimension: 'ROWS',
          }),
        });
        break;

      default:
        throw new Error('Invalid operation');
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to perform sheets operation');
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in google-sheets function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
})

async function getAccessToken(clientId: string, clientSecret: string) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(tokenData.error || 'Failed to obtain access token');
  }

  return tokenData.access_token;
}
