import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

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
    // Get Glide API token
    const glideApiToken = Deno.env.get('GLIDE_API_TOKEN');
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

    // Get Supabase configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation } = await req.json();
    console.log('Operation requested:', operation);
    
    switch (operation) {
      case 'list-apps': {
        console.log('Fetching apps list from Glide API');
        console.log('Using Glide API Token:', glideApiToken.substring(0, 8) + '...');
        
        // Ensure token is properly formatted
        const token = glideApiToken.trim();
        if (!token.match(/^[a-f0-9-]{36}$/)) {
          console.error('Invalid Glide API token format');
          throw new Error('Invalid Glide API token format');
        }

        // Using the v3 API endpoint
        const response = await fetch('https://api.glideapp.io/api/v3/apps', {
          method: 'GET',
          headers: {
            'X-Glide-API-Key': token,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Glide API error (${response.status}):`, errorText);
          console.error('Request headers:', {
            'X-Glide-API-Key': token.substring(0, 8) + '...',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          });
          
          // Log the error to edge_function_logs
          await supabase.from('edge_function_logs').insert({
            function_name: 'glide-apps-sync',
            status: 'error',
            message: `Glide API error: ${response.status} - ${errorText}`
          });
          
          if (response.status === 401) {
            throw new Error('Invalid Glide API token. Please check your token and try again.');
          }
          
          throw new Error(`Glide API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Successfully fetched apps list');
        
        // Log successful operation
        await supabase.from('edge_function_logs').insert({
          function_name: 'glide-apps-sync',
          status: 'success',
          message: 'Successfully fetched Glide apps list'
        });
        
        return new Response(
          JSON.stringify({ apps: data }), 
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
    
    // Log the error
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('edge_function_logs').insert({
        function_name: 'glide-apps-sync',
        status: 'error',
        message: error.message
      });
    }
    
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