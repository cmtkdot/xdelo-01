import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appId, appName } = await req.json();

    if (!appId || !appName) {
      throw new Error('App ID and name are required');
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

    // First insert the Glide app
    const { data: appData, error: appError } = await supabase
      .from('glide_apps')
      .insert([{
        app_id: appId,
        app_name: appName,
        is_active: true
      }])
      .select()
      .single();

    if (appError) throw appError;

    // Create table configs for each table
    const tableConfigs = tables.map((table: any) => ({
      app_id: appData.id,
      table_id: table.id,
      table_name: table.name,
      sync_direction: 'bidirectional',
      sync_interval: 3600, // 1 hour in seconds
      is_active: true,
      column_mapping: table.columns || {},
      validation_rules: {}
    }));

    const { error: tableError } = await supabase
      .from('glide_table_configs')
      .insert(tableConfigs);

    if (tableError) throw tableError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'App and tables configured successfully',
        app: appData,
        tableCount: tables.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error configuring Glide app:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});