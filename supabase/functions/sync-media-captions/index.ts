import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    // Get media items with empty captions or in media groups
    const { data: mediaItems, error: fetchError } = await supabase
      .from('media')
      .select('*')
      .or('caption.is.null,media_group_id.is.not.null')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    console.log(`Found ${mediaItems?.length || 0} media items to process`);

    const processedGroups = new Set();
    const results = {
      processed: 0,
      updated: 0,
      errors: [] as string[]
    };

    for (const media of mediaItems || []) {
      try {
        if (media.media_group_id && !processedGroups.has(media.media_group_id)) {
          // Process media group
          processedGroups.add(media.media_group_id);
          
          const { data: groupMedia } = await supabase
            .from('media')
            .select('*')
            .eq('media_group_id', media.media_group_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (groupMedia?.metadata?.message_id) {
            const response = await fetch(
              `https://api.telegram.org/bot${botToken}/getMessage?chat_id=${groupMedia.chat_id}&message_id=${groupMedia.metadata.message_id}`
            );

            if (!response.ok) {
              throw new Error(`Failed to get message: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.ok && data.result.caption !== groupMedia.caption) {
              const { error: updateError } = await supabase
                .from('media')
                .update({ caption: data.result.caption })
                .eq('media_group_id', media.media_group_id);

              if (updateError) throw updateError;
              results.updated++;
            }
          }
        } else if (!media.media_group_id && !media.caption && media.metadata?.message_id) {
          // Process single media
          const response = await fetch(
            `https://api.telegram.org/bot${botToken}/getMessage?chat_id=${media.chat_id}&message_id=${media.metadata.message_id}`
          );

          if (!response.ok) {
            throw new Error(`Failed to get message: ${response.statusText}`);
          }

          const data = await response.json();
          if (data.ok && data.result.caption) {
            const { error: updateError } = await supabase
              .from('media')
              .update({ caption: data.result.caption })
              .eq('id', media.id);

            if (updateError) throw updateError;
            results.updated++;
          }
        }
        results.processed++;
      } catch (error) {
        console.error(`Error processing media ${media.id}:`, error);
        results.errors.push(`Media ${media.id}: ${error.message}`);
      }
    }

    // Log the sync operation
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'sync-media-captions',
        status: results.errors.length > 0 ? 'partial' : 'success',
        message: `Processed ${results.processed} items, updated ${results.updated} captions, ${results.errors.length} errors`
      });

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-media-captions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});