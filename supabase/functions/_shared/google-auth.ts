import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function getGoogleApiKey() {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.functions.invoke('get-google-api-key');
    
    if (error) {
      console.error('Error fetching Google API key:', error);
      throw error;
    }

    return data.api_key;
  } catch (error) {
    console.error('Failed to get Google API key:', error);
    throw error;
  }
}