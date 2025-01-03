import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting public URL update process');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch all media items that need public URL updates
    const { data: mediaItems, error: fetchError } = await supabaseClient
      .from('media')
      .select('*')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('Error fetching media items:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${mediaItems?.length || 0} media items to update`);

    const updates = mediaItems?.map(item => {
      const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${item.file_name}`;
      
      return {
        id: item.id,
        user_id: user.id, // Ensure user_id is included in the update
        public_url: publicUrl
      };
    });

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
      );
    }

    // Update records in batches
    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(updates.length/batchSize)}`);
      
      const { data, error } = await supabaseClient
        .from('media')
        .upsert(batch, { onConflict: 'id' })
        .select();

      if (error) {
        console.error('Error updating batch:', error);
        throw error;
      }
      
      results.push(...(data || []));
    }

    console.log(`Successfully updated ${results.length} media records`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${results.length} media records with public URLs`,
        updatedCount: results.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in update-media-public-urls function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});