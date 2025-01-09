import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    if (req.headers.get("content-type") !== "application/json") {
      throw new Error("Content-Type must be application/json");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log start of operation
    await supabase.from('edge_function_logs').insert({
      function_name: 'sync-media-captions',
      status: 'info',
      message: 'Starting media captions sync'
    });

    // Get all media groups
    const { data: mediaGroups, error: groupsError } = await supabase
      .from('media')
      .select('*')
      .not('media_group_id', 'is', null)
      .order('media_group_id');

    if (groupsError) {
      throw new Error(`Failed to fetch media groups: ${groupsError.message}`);
    }

    // Group media by media_group_id
    const groupedMedia = mediaGroups.reduce((acc: Record<string, any[]>, media: any) => {
      const groupId = media.media_group_id;
      if (!acc[groupId]) {
        acc[groupId] = [];
      }
      acc[groupId].push(media);
      return acc;
    }, {});

    const results = [];
    const errors = [];

    // Process each media group
    for (const [groupId, mediaItems] of Object.entries(groupedMedia)) {
      try {
        // Get the first item's caption (assuming it's the main caption for the group)
        const mainCaption = mediaItems[0]?.caption || '';

        // Update all items in the group with the same caption
        const { error: updateError } = await supabase
          .from('media')
          .update({ 
            caption: mainCaption,
            updated_at: new Date().toISOString()
          })
          .eq('media_group_id', groupId);

        if (updateError) {
          throw new Error(`Failed to update group ${groupId}: ${updateError.message}`);
        }

        results.push({
          groupId,
          status: 'updated',
          mediaCount: mediaItems.length,
          caption: mainCaption
        });

        // Log successful update
        await supabase.from('edge_function_logs').insert({
          function_name: 'sync-media-captions',
          status: 'success',
          message: `Updated captions for media group ${groupId} (${mediaItems.length} items)`
        });

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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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
        status: error.message.includes('Content-Type') ? 400 : 500
      }
    );
  }
});