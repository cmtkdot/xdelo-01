import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the request body
    const { mediaIds } = await req.json()
    console.log('Resyncing media for IDs:', mediaIds)

    if (!mediaIds || !Array.isArray(mediaIds)) {
      throw new Error('Invalid or missing mediaIds')
    }

    // Log the start of the operation
    await supabaseClient
      .from('edge_function_logs')
      .insert({
        function_name: 'resync-media',
        status: 'info',
        message: `Starting resync for ${mediaIds.length} media items`
      })

    // Fetch media records that need resyncing
    const { data: mediaItems, error: fetchError } = await supabaseClient
      .from('media')
      .select('*')
      .in('id', mediaIds)

    if (fetchError) {
      throw fetchError
    }

    console.log('Found media items:', mediaItems?.length)

    // Process each media item
    const results = await Promise.all((mediaItems || []).map(async (media) => {
      try {
        // Update the media record with refreshed data
        const { error: updateError } = await supabaseClient
          .from('media')
          .update({
            updated_at: new Date().toISOString(),
            // Add any additional fields that need updating
          })
          .eq('id', media.id)

        if (updateError) throw updateError

        return { id: media.id, status: 'success' }
      } catch (error) {
        console.error(`Error processing media ${media.id}:`, error)
        return { id: media.id, status: 'error', error: error.message }
      }
    }))

    // Log the completion
    await supabaseClient
      .from('edge_function_logs')
      .insert({
        function_name: 'resync-media',
        status: 'success',
        message: `Completed resync for ${results.length} media items`
      })

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in resync-media function:', error)

    // Log the error
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseClient
      .from('edge_function_logs')
      .insert({
        function_name: 'resync-media',
        status: 'error',
        message: error.message
      })

    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})