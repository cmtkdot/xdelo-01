import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
    const clientEmail = credentials.client_email;
    const privateKey = credentials.private_key;

    if (!clientEmail || !privateKey) {
      throw new Error('Invalid service account credentials');
    }

    // Generate JWT
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    // Sign JWT
    const encoder = new TextEncoder();
    const input = encoder.encode(JSON.stringify(claim));
    
    const keyData = await crypto.subtle.importKey(
      'pkcs8',
      new TextEncoder().encode(privateKey),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      keyData,
      input
    );

    const jwt = `${btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${btoa(JSON.stringify(claim))}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    const tokenData = await tokenResponse.json();

    return new Response(
      JSON.stringify(tokenData),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});