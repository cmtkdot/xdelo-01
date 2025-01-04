import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    let chatIds: number[] = [];
    try {
      const body = await req.text();
      console.log('Request body:', body);
      
      if (body) {
        const parsedBody = JSON.parse(body);
        if (parsedBody.chatIds && Array.isArray(parsedBody.chatIds)) {
          chatIds = parsedBody.chatIds;
        }
      }
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      await supabaseClient
        .from('edge_function_logs')
        .insert({
          function_name: 'sync-media-captions',
          status: 'error',
          message: `Error parsing request body: ${parseError.message}`
        });
      throw parseError;
    }

    // Log the authentication attempt
    console.log('Attempting to get user from auth header');

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError) {
      console.error('User authentication error:', userError);
      await supabaseClient
        .from('edge_function_logs')
        .insert({
          function_name: 'sync-media-captions',
          status: 'error',
          message: `Authentication error: ${userError.message}`
        });
      throw userError;
    }

    if (!user) {
      console.error('No user found');
      await supabaseClient
        .from('edge_function_logs')
        .insert({
          function_name: 'sync-media-captions',
          status: 'error',
          message: 'No user found'
        });
      throw new Error('Unauthorized');
    }

    console.log(`Authenticated user: ${user.id}`);

    // If no chat IDs provided, fetch all active channels
    if (!chatIds || chatIds.length === 0) {
      console.log('No chat IDs provided, fetching active channels');
      const { data: channels, error: channelsError } = await supabaseClient
        .from('channels')
        .select('chat_id')
        .eq('is_active', true);

      if (channelsError) {
        console.error('Error fetching channels:', channelsError);
        await supabaseClient
          .from('edge_function_logs')
          .insert({
            function_name: 'sync-media-captions',
            status: 'error',
            message: `Error fetching channels: ${channelsError.message}`
          });
        throw channelsError;
      }

      chatIds = channels?.map(channel => channel.chat_id) || [];
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
      await supabaseClient
        .from('edge_function_logs')
        .insert({
          function_name: 'sync-media-captions',
          status: 'error',
          message: `Error fetching media items: ${fetchError.message}`
        });
      throw fetchError;
    }

    console.log(`Found ${mediaItems?.length || 0} media items to update`);

    if (!mediaItems?.length) {
      await supabaseClient
        .from('edge_function_logs')
        .insert({
          function_name: 'sync-media-captions',
          status: 'success',
          message: 'No media items found to update'
        });

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
        await supabaseClient
          .from('edge_function_logs')
          .insert({
            function_name: 'sync-media-captions',
            status: 'error',
            message: `Error updating batch: ${updateError.message}`
          });
        throw updateError;
      }
      
      updatedCount += batch.length;
    }

    console.log(`Successfully updated ${updatedCount} media records`);

    // Log the success
    await supabaseClient
      .from('edge_function_logs')
      .insert({
        function_name: 'sync-media-captions',
        status: 'success',
        message: `Updated ${updatedCount} media records with public URLs`
      });

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

    // Log the error
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseClient
      .from('edge_function_logs')
      .insert({
        function_name: 'sync-media-captions',
        status: 'error',
        message: error.message
      });

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