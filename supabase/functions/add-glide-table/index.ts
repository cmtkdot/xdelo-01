import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appId } = await req.json();

    if (!appId) {
      throw new Error('App ID is required');
    }

    const glideApiToken = Deno.env.get('GLIDE_API_TOKEN');
    if (!glideApiToken) {
      throw new Error('Missing Glide API token');
    }

    // Fetch tables from Glide API
    const response = await fetch('https://api.glideapp.io/api/function/listTables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${glideApiToken}`,
      },
      body: JSON.stringify({ appID: appId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tables: ${response.statusText}`);
    }

    const tables = await response.json();
    console.log('Fetched tables from Glide:', tables);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create table configs for each table
    const tableConfigs = tables.map((table: any) => ({
      app_id: appId,
      table_id: table.id,
      table_name: table.name,
      sync_direction: 'bidirectional',
      sync_interval: 3600,
      is_active: true,
    }));

    const { error } = await supabase
      .from('glide_table_configs')
      .upsert(tableConfigs, {
        onConflict: 'app_id,table_id',
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'Tables configured successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error configuring tables:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});