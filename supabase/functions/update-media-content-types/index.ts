import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get request parameters
    const { updatePublicUrls = true } = await req.json()

    // Fetch all media items for this user
    const { data: mediaItems, error: fetchError } = await supabaseClient
      .from('media')
      .select('*')
      .eq('user_id', user.id)

    if (fetchError) {
      console.error('Error fetching media items:', fetchError)
      throw fetchError
    }

    console.log(`Found ${mediaItems?.length || 0} media items to update`)

    const updates = mediaItems?.map(item => {
      const fileExt = item.file_name.split('.').pop()?.toLowerCase()
      let contentType = 'application/octet-stream'

      // Determine content type based on file extension
      switch (fileExt) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg'
          break
        case 'png':
          contentType = 'image/png'
          break
        case 'gif':
          contentType = 'image/gif'
          break
        case 'mp4':
          contentType = 'video/mp4'
          break
        case 'mov':
          contentType = 'video/quicktime'
          break
        case 'mp3':
          contentType = 'audio/mpeg'
          break
        case 'wav':
          contentType = 'audio/wav'
          break
        case 'pdf':
          contentType = 'application/pdf'
          break
      }

      // Generate public URL if requested
      const publicUrl = updatePublicUrls 
        ? `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${item.file_name}`
        : item.public_url

      return {
        id: item.id,
        user_id: user.id,
        content_type: contentType,
        public_url: publicUrl
      }
    })

    if (!updates?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No media items need updating',
          updatedCount: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Update records in batches
    const batchSize = 100
    const results = []
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(updates.length/batchSize)}`)
      
      const { data, error } = await supabaseClient
        .from('media')
        .upsert(batch, { onConflict: 'id' })
        .select()

      if (error) {
        console.error('Error updating batch:', error)
        throw error
      }
      
      results.push(...(data || []))

      // Update storage file content type
      for (const item of batch) {
        try {
          await supabaseClient.storage
            .from('telegram-media')
            .update(item.file_name, await (await fetch(item.file_url)).blob(), {
              contentType: item.content_type,
              upsert: true
            })
        } catch (error) {
          console.error(`Error updating storage content type for ${item.file_name}:`, error)
        }
      }
    }

    console.log(`Successfully updated ${results.length} media records`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${results.length} media records with content types${updatePublicUrls ? ' and public URLs' : ''}`,
        updatedCount: results.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in update-media-content-types function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})