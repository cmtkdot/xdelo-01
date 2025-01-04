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

    const { mediaIds } = await req.json();
    console.log('Starting media resync for IDs:', mediaIds);

    // Get media items to process
    const { data: mediaItems, error: fetchError } = await supabaseClient
      .from('media')
      .select('*')
      .in('id', mediaIds);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${mediaItems?.length || 0} media items to process`);

    const updates = [];
    const errors = [];

    // Process media items
    for (const item of mediaItems || []) {
      try {
        // Delete existing file from storage if it exists
        if (item.file_name) {
          const { error: deleteError } = await supabaseClient
            .storage
            .from('telegram-media')
            .remove([item.file_name]);

          if (deleteError) {
            console.error('Error deleting file:', deleteError);
            // Continue with update even if delete fails
          }
        }

        // Generate new public URL using the bucket's public URL
        const publicUrl = item.file_name 
          ? `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${item.file_name}`
          : null;

        // Update media record with new URLs
        const updateData = {
          id: item.id,
          public_url: publicUrl,
          file_url: publicUrl, // Use the same public URL for file_url
          updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabaseClient
          .from('media')
          .update(updateData)
          .eq('id', item.id);

        if (updateError) {
          throw updateError;
        }

        updates.push(updateData);
        console.log(`Successfully processed media item: ${item.id} with new URL: ${publicUrl}`);
      } catch (error) {
        console.error(`Error processing media item ${item.id}:`, error);
        errors.push({ id: item.id, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully resynced ${updates.length} media items`,
        updatedCount: updates.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errors.length > 0 ? 207 : 200,
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