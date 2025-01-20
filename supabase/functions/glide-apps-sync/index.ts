import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, appId } = await req.json();
    const glideApiToken = Deno.env.get('GLIDE_API_TOKEN');
    
    console.log('Operation requested:', operation);
    
    if (!glideApiToken) {
      console.error('Missing GLIDE_API_TOKEN in environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error: Missing Glide API token',
          details: 'Please ensure GLIDE_API_TOKEN is set in the edge function secrets'
        }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Test the token with a simple API call
    const testResponse = await fetch('https://api.glideapp.io/api/apps/list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${glideApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!testResponse.ok) {
      console.error(`Glide API authentication failed: ${testResponse.status}`);
      const errorText = await testResponse.text();
      console.error('Error details:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Glide API error: ${testResponse.status}`,
          details: errorText || 'Invalid or expired API token'
        }), 
        { 
          status: testResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    switch (operation) {
      case 'list-apps': {
        console.log('Fetching apps list from Glide API');
        const response = await fetch('https://api.glideapp.io/api/apps/list', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${glideApiToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Glide API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Successfully fetched apps list');
        
        return new Response(
          JSON.stringify({ apps: data }), 
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      case 'list-tables': {
        if (!appId) {
          return new Response(
            JSON.stringify({ error: 'App ID is required' }), 
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        console.log('Fetching tables for app:', appId);
        const response = await fetch(`https://api.glideapp.io/api/apps/${appId}/tables`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${glideApiToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Glide API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Successfully fetched tables for app:', appId);
        
        return new Response(
          JSON.stringify({ tables: data }), 
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown operation: ${operation}` }), 
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }
  } catch (error) {
    console.error('Error in glide-apps-sync:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'An unexpected error occurred while processing your request'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});