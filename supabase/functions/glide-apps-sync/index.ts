import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, appId } = await req.json();
    const glideApiToken = Deno.env.get('GLIDE_API_TOKEN');
    
    if (!glideApiToken) {
      console.error('Missing GLIDE_API_TOKEN in environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error: Missing Glide API token' 
        }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Test the token with a simple API call before proceeding
    const testResponse = await fetch('https://api.glideapp.io/api/apps/list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${glideApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!testResponse.ok) {
      console.error(`Glide API authentication failed: ${testResponse.status}`);
      return new Response(
        JSON.stringify({ 
          error: `Glide API error: ${testResponse.status}`,
          details: await testResponse.text()
        }), 
        { 
          status: testResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    switch (operation) {
      case 'list-apps': {
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