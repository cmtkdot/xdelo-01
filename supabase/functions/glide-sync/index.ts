import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GlideProduct {
  id: string;
  values: {
    "9aBFI"?: string; // account_row_id
    "FoyGX"?: string; // purchase_order_row_id
    "9ZlF5"?: string; // vpay_row_id
    "PIRCt"?: string; // sheet21pics_row_id
    "JnZ0i"?: string; // product_choice_row_id
    "qKFKb"?: string; // po_uid
    "Product Name"?: string;
    "0TFnd"?: string; // vendor_uid
    "6KEY6"?: string; // po_date
    "8rNtB"?: string; // product_name
    "7vTwD"?: string; // vendor_product_name
    "j1byF"?: string; // purchase_date
    "2vbZN"?: number; // total_qty_purchased
    "Cost"?: number;
    "2Oifn"?: number; // cost_update
    "BtdUy"?: boolean; // is_sample
    "zOV1T"?: boolean; // more_units_behind
    "PhXNJ"?: boolean; // is_fronted
    "TXvDh"?: boolean; // rename_product
    "yGgnd"?: string; // fronted_terms
    "6ELPK"?: number; // total_units_behind_sample
    "sWTUg"?: string; // leave_no
    "5Cedf"?: string; // purchase_notes
    "edjhe"?: boolean; // is_miscellaneous
    "vccH4"?: string; // category
    "Product Image 1"?: string;
    "qSE5p"?: string; // cart_note
    "pSr0T"?: boolean; // cart_rename
    "SXT3o"?: string; // submission_date
    "RD7cH"?: string; // submitter_email
    "t9wgm"?: string; // last_edited_date
  };
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

    const products = data[0]?.rows || []

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Map Glide products to Supabase format
    const mappedProducts = products.map((product: GlideProduct) => ({
      glide_row_id: product.id,
      product_data: product.values,
      account_row_id: product.values["9aBFI"],
      purchase_order_row_id: product.values["FoyGX"],
      vpay_row_id: product.values["9ZlF5"],
      sheet21pics_row_id: product.values["PIRCt"],
      product_choice_row_id: product.values["JnZ0i"],
      po_uid: product.values["qKFKb"],
      product_name: product.values["Product Name"],
      vendor_uid: product.values["0TFnd"],
      po_date: product.values["6KEY6"],
      vendor_product_name: product.values["7vTwD"],
      purchase_date: product.values["j1byF"],
      total_qty_purchased: product.values["2vbZN"],
      cost: product.values["Cost"],
      cost_update: product.values["2Oifn"],
      is_sample: product.values["BtdUy"],
      more_units_behind: product.values["zOV1T"],
      is_fronted: product.values["PhXNJ"],
      rename_product: product.values["TXvDh"],
      fronted_terms: product.values["yGgnd"],
      total_units_behind_sample: product.values["6ELPK"],
      leave_no: product.values["sWTUg"],
      purchase_notes: product.values["5Cedf"],
      is_miscellaneous: product.values["edjhe"],
      category: product.values["vccH4"],
      product_image_1: product.values["Product Image 1"],
      cart_note: product.values["qSE5p"],
      cart_rename: product.values["pSr0T"],
      submission_date: product.values["SXT3o"],
      submitter_email: product.values["RD7cH"],
      last_edited_date: product.values["t9wgm"],
      last_synced: new Date().toISOString(),
    }))

    // Store products in Supabase
    const { error: productsError } = await supabase
      .from('glide_products')
      .upsert(mappedProducts)

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