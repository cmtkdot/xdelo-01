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

    console.log('Starting media resync for user:', user.id);

    // Get all media items for the user
    const { data: mediaItems, error: fetchError } = await supabaseClient
      .from('media')
      .select('*')
      .eq('user_id', user.id);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${mediaItems?.length || 0} media items to process`);

    // Process media items in batches
    const batchSize = 50;
    const updates = [];

    for (let i = 0; i < (mediaItems?.length || 0); i += batchSize) {
      const batch = mediaItems.slice(i, i + batchSize);
      const batchUpdates = batch.map(item => {
        let publicUrl;
        
        if (item.media_type?.includes('video')) {
          publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${item.file_name}`;
        } else if (item.media_type?.includes('image') || item.media_type?.includes('photo')) {
          publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${item.file_name}`;
        } else {
          publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${item.file_name}`;
        }
        
        return {
          id: item.id,
          public_url: publicUrl,
          updated_at: new Date().toISOString()
        };
      });

      const { error: updateError } = await supabaseClient
        .from('media')
        .upsert(batchUpdates);

      if (updateError) {
        console.error('Error updating batch:', updateError);
        throw updateError;
      }

      updates.push(...batchUpdates);
      console.log(`Processed batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(mediaItems.length/batchSize)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully resynced ${updates.length} media items`,
        updatedCount: updates.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in resync-media function:', error);
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