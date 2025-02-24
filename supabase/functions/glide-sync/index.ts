import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from './cors.ts';
import { mapGlideProductToSupabase } from './productMapper.ts';

const GLIDE_BATCH_LIMIT = 500;

serve(async (req) => {
  // Always handle CORS preflight requests first
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      } 
    });
  }

  try {
    console.log('Starting Glide products sync...');

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const glideApiToken = Deno.env.get('GLIDE_API_TOKEN');
    const glideAppId = Deno.env.get('GLIDE_APP_ID');
    const glideTableProducts = Deno.env.get('GLIDE_TABLE_PRODUCTS');

    if (!glideApiToken || !glideAppId || !glideTableProducts) {
      throw new Error('Missing required Glide configuration');
    }

    console.log('Fetching products from Glide API...');
    
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
      console.error('Glide API error response:', errorText);
      throw new Error(`Glide API error: ${response.status} ${response.statusText}`);
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
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Map and validate products
    console.log('Mapping products to Supabase schema...');
    const mappedProducts = products
      .map(mapGlideProductToSupabase)
      .filter(product => {
        if (!product.glide_product_row_id) {
          console.warn('Skipping product with missing glide_product_row_id:', product);
          return false;
        }
        return true;
      });

    if (mappedProducts.length === 0) {
      throw new Error('No valid products to sync after filtering');
    }

    console.log(`Attempting to sync ${mappedProducts.length} valid products to Supabase...`);

    // Update the upsert operation to handle conflicts
    const { error: productsError } = await supabase
      .from('glide_products')
      .upsert(mappedProducts, {
        onConflict: 'glide_product_row_id',
        ignoreDuplicates: false
      });

    if (productsError) {
      console.error('Supabase error:', productsError);
      throw productsError;
    }

    console.log('Successfully synced products to Supabase');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Products synced successfully',
        count: mappedProducts.length 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error syncing Glide products:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});