import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GlideProduct {
  id: string;
  values: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const glideApiToken = Deno.env.get('GLIDE_API_TOKEN')
    const glideAppId = Deno.env.get('GLIDE_APP_ID')
    const glideTableProducts = Deno.env.get('GLIDE_TABLE_PRODUCTS')

    if (!glideApiToken || !glideAppId || !glideTableProducts) {
      throw new Error('Missing Glide configuration')
    }

    console.log('Starting Glide products sync...')
    console.log('Using table:', glideTableProducts)

    // Fetch products from Glide using the queryTables endpoint
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
            // No SQL query needed, we want all rows
          }
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Glide API error:', errorText)
      throw new Error(`Glide API error: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Successfully fetched Glide products:', data)

    // The response contains an array of query results
    // Each query result has a 'rows' property with the actual data
    const products = data[0]?.rows || []

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Store products in Supabase
    const { error: productsError } = await supabase
      .from('glide_products')
      .upsert(products.map((product: GlideProduct) => ({
        glide_row_id: product.id,
        product_data: product.values,
        last_synced: new Date().toISOString(),
      })))

    if (productsError) {
      console.error('Supabase error:', productsError)
      throw productsError
    }

    console.log('Successfully synced products to Supabase')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Products synced successfully',
        count: products.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error syncing Glide products:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})