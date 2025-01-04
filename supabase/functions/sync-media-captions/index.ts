import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { logOperation } from "../_shared/database.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId, messageId, chatIds } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log start of operation
    await logOperation(
      supabase,
      'sync-media-captions',
      'info',
      `Starting caption sync operation`
    );

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    // If specific message sync is requested
    if (chatId && messageId) {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getMessages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            message_ids: [messageId],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch message: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.ok || !data.result || !data.result[0]) {
        throw new Error('Invalid response from Telegram API');
      }

      const message = data.result[0];
      const caption = message.caption || null;

      const { error: updateError } = await supabase
        .from('media')
        .update({ 
          caption,
          updated_at: new Date().toISOString()
        })
        .eq('chat_id', chatId)
        .contains('metadata', { message_id: messageId });

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Caption synced successfully"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Batch sync for multiple channels
    if (chatIds && Array.isArray(chatIds)) {
      const results = [];
      const errors = [];

      for (const channelId of chatIds) {
        try {
          // Get media records for this channel that have message_id in metadata
          const { data: mediaRecords, error: fetchError } = await supabase
            .from('media')
            .select('*')
            .eq('chat_id', channelId)
            .not('metadata', 'is', null);

          if (fetchError) throw fetchError;

          // Process each media record
          for (const media of mediaRecords || []) {
            try {
              const messageId = media.metadata?.message_id;
              if (!messageId) continue;

              const response = await fetch(
                `https://api.telegram.org/bot${botToken}/getMessages`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    chat_id: channelId,
                    message_ids: [messageId],
                  }),
                }
              );

              if (!response.ok) {
                throw new Error(`Failed to fetch message: ${response.statusText}`);
              }

              const data = await response.json();
              if (!data.ok || !data.result || !data.result[0]) continue;

              const message = data.result[0];
              const caption = message.caption || null;

              // Update caption if different
              if (caption !== media.caption) {
                const { error: updateError } = await supabase
                  .from('media')
                  .update({ 
                    caption,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', media.id);

                if (updateError) throw updateError;
                results.push({ id: media.id, status: 'updated' });
              }
            } catch (error) {
              console.error(`Error processing media ${media.id}:`, error);
              errors.push({ mediaId: media.id, error: error.message });
            }
          }
        } catch (error) {
          console.error(`Error processing channel ${channelId}:`, error);
          errors.push({ channelId, error: error.message });
        }
      }

      await logOperation(
        supabase,
        'sync-media-captions',
        errors.length ? 'error' : 'success',
        `Sync completed with ${results.length} updates and ${errors.length} errors`
      );

      return new Response(
        JSON.stringify({
          success: true,
          processed: results.length,
          errors: errors.length,
          details: {
            results,
            errors
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Missing required parameters: either (chatId and messageId) or chatIds array must be provided');

  } catch (error) {
    console.error('Error in sync-media-captions function:', error);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await logOperation(
      supabase,
      'sync-media-captions',
      'error',
      `Error: ${error.message}`
    );

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});