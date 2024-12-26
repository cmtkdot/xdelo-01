import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting caption sync process');

    // Get all media items with media_group_id
    const { data: mediaGroups, error: fetchError } = await supabase
      .from('media')
      .select('*')
      .not('media_group_id', 'is', null)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    // Group media by media_group_id
    const groupedMedia = mediaGroups.reduce((acc: any, item: any) => {
      if (!acc[item.media_group_id]) {
        acc[item.media_group_id] = [];
      }
      acc[item.media_group_id].push(item);
      return acc;
    }, {});

    let syncedCount = 0;
    console.log(`Found ${Object.keys(groupedMedia).length} media groups to process`);

    // Process each media group
    for (const [groupId, items] of Object.entries(groupedMedia)) {
      const mediaItems = items as any[];
      
      // Find the most recent caption in the group
      const latestCaption = mediaItems
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .find(item => item.caption)?.caption;

      if (latestCaption) {
        console.log(`Syncing caption for media group ${groupId}: "${latestCaption}"`);
        
        // Update all items in the group with the latest caption
        const { error: updateError } = await supabase
          .from('media')
          .update({ caption: latestCaption })
          .eq('media_group_id', groupId);

        if (updateError) {
          console.error(`Error updating captions for group ${groupId}:`, updateError);
          continue;
        }

        syncedCount += mediaItems.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced captions for ${syncedCount} media items`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});