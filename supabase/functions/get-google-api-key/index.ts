import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logToDatabase = async (supabase: any, status: 'info' | 'error' | 'success', message: string) => {
  try {
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'get-google-api-key',
        status,
        message
      });
  } catch (error) {
    console.error('Error logging to database:', error);
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    await logToDatabase(supabaseClient, 'info', `Fetching Google API key for user: ${user.id}`);

    const api_key = Deno.env.get('GOOGLE_API_KEY');
    if (!api_key) {
      await logToDatabase(supabaseClient, 'error', 'Google API key not configured');
      throw new Error('Google API key not configured');
    }

    await logToDatabase(supabaseClient, 'success', 'Successfully retrieved Google API key');

    return new Response(
      JSON.stringify({
        api_key,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in get-google-api-key function:', error);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await logToDatabase(supabaseClient, 'error', `Error: ${error.message}`);

    return new Response(
      JSON.stringify({ 
        error: error.message,
        hint: "Please ensure you're authenticated and the GOOGLE_API_KEY is set in the Edge Function secrets"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Not authenticated' ? 401 : 500,
      },
    )
  }
})