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
    "eb7jA"?: string; // supabase_media_id
    "Qr1Tl"?: string; // supabase_video_link
    "zwLpG"?: string; // supabase_caption
    "iIFAY"?: string; // supabase_google_url
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
            limit: 100 // Add a limit to prevent timeout
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
    
    if (products.length === 0) {
      console.log('No products found in Glide response')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No products to sync',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Map Glide products to Supabase format with null checks
    const mappedProducts = products.map((product: GlideProduct) => {
      // Ensure product.values exists
      const values = product.values || {};
      console.log('Processing product:', product.id, 'with values:', values);
      
      // Parse dates and numbers safely
      const parseDate = (dateStr: string | undefined) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date.toISOString();
      };

      const parseNumber = (num: any) => {
        if (num === undefined || num === null) return null;
        const parsed = Number(num);
        return isNaN(parsed) ? null : parsed;
      };

      return {
        glide_row_id: product.id,
        product_data: values,
        account_row_id: values["9aBFI"] || null,
        purchase_order_row_id: values["FoyGX"] || null,
        vpay_row_id: values["9ZlF5"] || null,
        sheet21pics_row_id: values["PIRCt"] || null,
        product_choice_row_id: values["JnZ0i"] || null,
        po_uid: values["qKFKb"] || null,
        product_name: values["Product Name"] || values["8rNtB"] || null,
        vendor_uid: values["0TFnd"] || null,
        po_date: parseDate(values["6KEY6"]),
        vendor_product_name: values["7vTwD"] || null,
        purchase_date: parseDate(values["j1byF"]),
        total_qty_purchased: parseNumber(values["2vbZN"]),
        cost: parseNumber(values["Cost"]),
        cost_update: parseNumber(values["2Oifn"]),
        is_sample: values["BtdUy"] || null,
        more_units_behind: values["zOV1T"] || null,
        is_fronted: values["PhXNJ"] || null,
        rename_product: values["TXvDh"] || null,
        fronted_terms: values["yGgnd"] || null,
        total_units_behind_sample: parseNumber(values["6ELPK"]),
        leave_no: values["sWTUg"] || null,
        purchase_notes: values["5Cedf"] || null,
        is_miscellaneous: values["edjhe"] || null,
        category: values["vccH4"] || null,
        product_image_1: values["Product Image 1"] || null,
        cart_note: values["qSE5p"] || null,
        cart_rename: values["pSr0T"] || null,
        submission_date: parseDate(values["SXT3o"]),
        submitter_email: values["RD7cH"] || null,
        last_edited_date: parseDate(values["t9wgm"]),
        supabase_media_id: values["eb7jA"] || null,
        supabase_video_link: values["Qr1Tl"] || null,
        supabase_caption: values["zwLpG"] || null,
        supabase_google_url: values["iIFAY"] || null,
        last_synced: new Date().toISOString(),
      }
    })

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