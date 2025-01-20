import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, appId } = await req.json();
    const glideApiToken = Deno.env.get('GLIDE_API_TOKEN');
    
    if (!glideApiToken) {
      throw new Error('Missing GLIDE_API_TOKEN');
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
        return new Response(JSON.stringify({ apps: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'list-tables': {
        if (!appId) {
          throw new Error('App ID is required');
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
        return new Response(JSON.stringify({ tables: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error('Error in glide-apps-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});