import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

const GLIDE_BATCH_LIMIT = 500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tableConfig, operation } = await req.json();
    
    if (!tableConfig || !tableConfig.id) {
      throw new Error('Table configuration is required');
    }

    const glideApiToken = Deno.env.get('GLIDE_API_TOKEN');
    if (!glideApiToken) {
      throw new Error('Missing GLIDE_API_TOKEN');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the app details
    const { data: appData, error: appError } = await supabase
      .from('glide_apps')
      .select('app_id')
      .eq('id', tableConfig.app_id)
      .single();

    if (appError) throw appError;

    // Fetch data from Glide API
    const response = await fetch('https://api.glideapp.io/api/function/queryTables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${glideApiToken}`,
      },
      body: JSON.stringify({
        appID: appData.app_id,
        queries: [
          {
            tableName: tableConfig.table_id,
            limit: GLIDE_BATCH_LIMIT
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Glide API error: ${response.status}`);
    }

    const data = await response.json();
    const rows = data[0]?.rows || [];
    console.log(`Fetched ${rows.length} rows from Glide`);

    // Map and store the data
    const mappedRows = rows.map((row: any) => ({
      glide_product_row_id: row.$rowID,
      product_data: row,
      table_config_id: tableConfig.id,
      last_synced: new Date().toISOString()
    }));

    // Upsert the data into glide_products
    const { error: upsertError } = await supabase
      .from('glide_products')
      .upsert(mappedRows, {
        onConflict: 'glide_product_row_id',
        ignoreDuplicates: false
      });

    if (upsertError) throw upsertError;

    // Update last_synced timestamp
    const { error: updateError } = await supabase
      .from('glide_table_configs')
      .update({ 
        last_synced: new Date().toISOString(),
        sync_interval: operation === 'enable_auto_sync' ? 3600 : null
      })
      .eq('id', tableConfig.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${mappedRows.length} rows successfully`,
        count: mappedRows.length,
        lastSynced: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing Glide table:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});