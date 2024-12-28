import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { GlideResponse } from './types.ts';
import { corsHeaders } from './utils.ts';
import { mapGlideProductToSupabase } from './productMapper.ts';

const GLIDE_BATCH_LIMIT = 500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Glide products sync...');

    const glideApiToken = Deno.env.get('GLIDE_API_TOKEN');
    const glideAppId = Deno.env.get('GLIDE_APP_ID');
    const glideTableProducts = Deno.env.get('GLIDE_TABLE_PRODUCTS');

    if (!glideApiToken || !glideAppId || !glideTableProducts) {
      throw new Error('Missing Glide configuration');
    }

    console.log('Using table:', glideTableProducts);

    // Fetch products from Glide with limit
    const response = await fetch('https://api.glideapp.io/api/function/queryTables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${glideApiToken}`,
      },
      body: JSON.stringify({
        appID: glideAppId,
        queries: [
          {
            tableName: glideTableProducts,
            limit: GLIDE_BATCH_LIMIT
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Glide API error:', errorText);
      throw new Error(`Glide API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Successfully fetched Glide products:', data);

    const products = data[0]?.rows || [];
    
    if (products.length === 0) {
      console.log('No products found in Glide response');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No products to sync',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (products.length > GLIDE_BATCH_LIMIT) {
      console.warn(`Retrieved ${products.length} products, exceeding the limit of ${GLIDE_BATCH_LIMIT}`);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Map and store products in Supabase
    const mappedProducts = products.map(mapGlideProductToSupabase);

    const { error: productsError } = await supabase
      .from('glide_products')
      .upsert(mappedProducts);

    if (productsError) {
      console.error('Supabase error:', productsError);
      throw productsError;
    }

    console.log('Successfully synced products to Supabase');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Products synced successfully',
        count: products.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing Glide products:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});