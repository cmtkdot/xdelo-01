import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from './cors.ts';

const GLIDE_BATCH_LIMIT = 500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appId, tableId } = await req.json();
    console.log('Starting Glide apps sync for:', { appId, tableId });

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get table config
    const { data: tableConfig, error: configError } = await supabase
      .from('glide_table_configs')
      .select('*')
      .eq('table_id', tableId)
      .single();

    if (configError || !tableConfig) {
      throw new Error(`Table config not found: ${configError?.message}`);
    }

    // Get Glide API token
    const glideApiToken = Deno.env.get('GLIDE_API_TOKEN');
    if (!glideApiToken) {
      throw new Error('Missing Glide API token');
    }

    // Fetch data from Glide
    const response = await fetch('https://api.glideapp.io/api/function/queryTables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${glideApiToken}`,
      },
      body: JSON.stringify({
        appID: appId,
        queries: [
          {
            tableName: tableId,
            limit: GLIDE_BATCH_LIMIT
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Glide API error:', errorText);
      throw new Error(`Glide API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data[0]?.rows || [];
    console.log(`Fetched ${rows.length} rows from Glide`);

    // Update sync timestamp
    await supabase
      .from('glide_table_configs')
      .update({ 
        last_synced: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', tableConfig.id);

    // Create or update table for this Glide table if it doesn't exist
    const tableName = `glide_table_${tableConfig.id.replace(/-/g, '_')}`;
    const { error: tableError } = await supabase.rpc('create_dynamic_glide_table', {
      p_table_name: tableName,
      p_columns: JSON.stringify(Object.keys(rows[0] || {}))
    });

    if (tableError) {
      console.error('Error creating/updating table:', tableError);
      throw tableError;
    }

    // Upsert data into the dynamic table
    const { error: upsertError } = await supabase
      .from(tableName)
      .upsert(
        rows.map(row => ({
          ...row,
          last_synced: new Date().toISOString()
        })),
        { onConflict: '$rowID' }
      );

    if (upsertError) {
      console.error('Error upserting data:', upsertError);
      throw upsertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data synced successfully',
        count: rows.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in Glide apps sync:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});