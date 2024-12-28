import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function generateJWT() {
  const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
  
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const key = credentials.private_key;
  const header = { alg: "RS256", typ: "JWT" };
  
  const encoder = new TextEncoder();
  const input = encoder.encode(`${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(claim))}`);
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    encoder.encode(key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    input
  );

  const jwt = `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(claim))}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
  return jwt;
}

async function getAccessToken() {
  const jwt = await generateJWT();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { spreadsheetId, range, values, operation } = await req.json();
    const accessToken = await getAccessToken();

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