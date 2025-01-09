import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log start of operation
    await supabase.from('edge_function_logs').insert({
      function_name: 'sync-media-captions',
      status: 'info',
      message: 'Starting media captions sync based on media groups'
    });

    // Get all media groups
    const { data: mediaGroups, error: groupsError } = await supabase
      .from('media')
      .select('media_group_id')
      .not('media_group_id', 'is', null)
      .order('media_group_id');

    if (groupsError) {
      throw new Error(`Failed to fetch media groups: ${groupsError.message}`);
    }

    // Get unique media group IDs
    const uniqueGroupIds = [...new Set(mediaGroups.map(m => m.media_group_id))];
    console.log(`Found ${uniqueGroupIds.length} unique media groups to process`);

    const results = [];
    const errors = [];

    // Process each media group
    for (const groupId of uniqueGroupIds) {
      try {
        console.log(`Processing media group ${groupId}`);
        
        // Get all media items in this group
        const { data: groupMedia, error: mediaError } = await supabase
          .from('media')
          .select('*')
          .eq('media_group_id', groupId)
          .order('created_at');

        if (mediaError) throw mediaError;

        // Find the first media item with a caption
        const mediaWithCaption = groupMedia.find(m => m.caption && m.caption.trim() !== '');
        
        if (mediaWithCaption) {
          console.log(`Found caption "${mediaWithCaption.caption}" in group ${groupId}`);
          
          // Update all items in the group that don't have captions
          const { error: updateError } = await supabase
            .from('media')
            .update({ 
              caption: mediaWithCaption.caption,
              updated_at: new Date().toISOString()
            })
            .eq('media_group_id', groupId)
            .is('caption', null);

          if (updateError) {
            throw new Error(`Failed to update group ${groupId}: ${updateError.message}`);
          }

          results.push({
            groupId,
            status: 'updated',
            mediaCount: groupMedia.length,
            caption: mediaWithCaption.caption
          });

          // Log successful update
          await supabase.from('edge_function_logs').insert({
            function_name: 'sync-media-captions',
            status: 'success',
            message: `Updated captions for media group ${groupId} (${groupMedia.length} items) with caption: ${mediaWithCaption.caption}`
          });
        } else {
          console.log(`No caption found in group ${groupId}`);
        }

      } catch (error) {
        console.error(`Error processing group ${groupId}:`, error);
        errors.push({ groupId, error: error.message });

        // Log error
        await supabase.from('edge_function_logs').insert({
          function_name: 'sync-media-captions',
          status: 'error',
          message: `Error updating group ${groupId}: ${error.message}`
        });
      }
    }

    // Log completion
    await supabase.from('edge_function_logs').insert({
      function_name: 'sync-media-captions',
      status: errors.length ? 'error' : 'success',
      message: `Sync completed with ${results.length} updates and ${errors.length} errors`
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        errors: errors.length,
        details: { results, errors }
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error in sync-media-captions:', error);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Log error
    await supabase.from('edge_function_logs').insert({
      function_name: 'sync-media-captions',
      status: 'error',
      message: `Error: ${error.message}`
    });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});