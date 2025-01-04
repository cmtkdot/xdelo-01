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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get all active channels
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('chat_id')
      .eq('is_active', true);

    if (channelsError) throw channelsError;

    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No active channels found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chatIds = channels.map(channel => channel.chat_id);
    console.log('Syncing captions for channels:', chatIds);

    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'sync-media-captions',
        status: 'info',
        message: `Starting caption sync for channels: ${chatIds.join(', ')}`
      });

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    // Get media items without captions or with potentially outdated captions
    const { data: mediaItems, error: mediaError } = await supabase
      .from('media')
      .select('*')
      .in('chat_id', chatIds)
      .is('caption', null);

    if (mediaError) throw mediaError;

    if (!mediaItems || mediaItems.length === 0) {
      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'sync-media-captions',
          status: 'info',
          message: 'No media items found to update'
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No media items found that need caption updates' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updates = [];
    const errors = [];

    for (const item of mediaItems) {
      try {
        const messageId = item.metadata?.message_id;
        const chatId = item.chat_id;

        if (!messageId || !chatId) {
          console.log(`Skipping item ${item.id}: Missing message_id or chat_id`);
          continue;
        }

        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/getMessages?chat_id=${chatId}&message_ids=${messageId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch message from Telegram: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.ok && data.result && data.result[0]) {
          const message = data.result[0];
          const caption = message.caption || null;

          if (caption !== item.caption) {
            const { error: updateError } = await supabase
              .from('media')
              .update({ 
                caption,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id);

            if (updateError) throw updateError;

            updates.push({ id: item.id, newCaption: caption });
          }
        }
      } catch (error) {
        console.error(`Error updating caption for media ${item.id}:`, error);
        errors.push({ id: item.id, error: error.message });
      }
    }

    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'sync-media-captions',
        status: 'success',
        message: 'Successfully synchronized media captions'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        updates,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-media-captions function:', error);

    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'sync-media-captions',
        status: 'error',
        message: `Error: ${error.message}`
      });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});