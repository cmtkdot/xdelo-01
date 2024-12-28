import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

    // Fetch products from Glide
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
            utc: true,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Glide API error: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Successfully fetched Glide products:', data)

    // Store products in Supabase
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Create products table if it doesn't exist
    const { error: productsError } = await supabaseClient
      .from('glide_products')
      .upsert(data.map((product: GlideProduct) => ({
        glide_row_id: product.id,
        product_data: product.values,
        last_synced: new Date().toISOString(),
      })))

    if (productsError) throw productsError

    return new Response(
      JSON.stringify({ success: true, message: 'Products synced successfully' }),
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