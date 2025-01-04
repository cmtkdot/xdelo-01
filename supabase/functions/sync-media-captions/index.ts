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

    const { chatIds } = await req.json();
    
    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      throw new Error('No chat IDs provided');
    }

    console.log(`Processing ${chatIds.length} channels for user ${user.id}`);

    // Fetch media items for the specified channels
    const { data: mediaItems, error: fetchError } = await supabaseClient
      .from('media')
      .select('*')
      .in('chat_id', chatIds)
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('Error fetching media items:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${mediaItems?.length || 0} media items to update`);

    if (!mediaItems?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No media items found to update',
          updatedCount: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Update media items with correct public URLs
    const updates = mediaItems.map(item => {
      let publicUrl;
      
      if (item.media_type?.includes('video')) {
        publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-video/${item.file_name}`;
      } else if (item.media_type?.includes('image') || item.media_type?.includes('photo')) {
        publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-pictures/${item.file_name}`;
      } else {
        publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${item.file_name}`;
      }
      
      return {
        id: item.id,
        public_url: publicUrl
      };
    });

    // Update records in batches
    const batchSize = 100;
    let updatedCount = 0;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(updates.length/batchSize)}`);
      
      const { error: updateError } = await supabaseClient
        .from('media')
        .upsert(batch, { 
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (updateError) {
        console.error('Error updating batch:', updateError);
        throw updateError;
      }
      
      updatedCount += batch.length;
    }

    console.log(`Successfully updated ${updatedCount} media records`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updatedCount} media records with public URLs`,
        updatedCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in sync-media-captions function:', error);
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