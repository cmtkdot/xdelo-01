import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { validateRequest, validateMediaRecords } from "./utils/validation.ts";
import { fetchTelegramMessages, createCaptionMap } from "./utils/telegramApi.ts";
import { logOperation } from "../_shared/database.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate content type
  const contentType = req.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.error('Invalid content type:', contentType);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Content-Type must be application/json'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('Starting caption sync process');
    const { chatIds, mediaGroupId } = await validateRequest(req);

    await logOperation(
      supabase,
      'sync-media-captions',
      'info',
      `Starting caption sync for ${mediaGroupId ? `media group: ${mediaGroupId}` : `channels: ${chatIds.join(', ')}`}`
    );

    const mediaRecords = await validateMediaRecords(supabase, mediaGroupId, chatIds);
    
    if ('message' in mediaRecords) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: mediaRecords.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const mediaByChat = mediaRecords.reduce((acc, media) => {
      if (!media.chat_id) return acc;
      if (!acc[media.chat_id]) acc[media.chat_id] = [];
      acc[media.chat_id].push(media);
      return acc;
    }, {} as Record<number, typeof mediaRecords>);

    const results = [];
    const errors = [];

    for (const [chatId, chatMedia] of Object.entries(mediaByChat)) {
      try {
        const messageIds = [...new Set(chatMedia
          .map(m => m.metadata?.message_id)
          .filter(Boolean))];

        if (messageIds.length === 0) continue;

        console.log(`Fetching ${messageIds.length} messages for chat ${chatId}`);
        const messages = await fetchTelegramMessages(botToken, chatId, messageIds);
        const captionMap = createCaptionMap(messages);

        for (const media of chatMedia) {
          try {
            const messageId = media.metadata?.message_id;
            if (!messageId) continue;

            const newCaption = captionMap[messageId];
            if (newCaption === undefined) continue;

            if (newCaption !== media.caption) {
              const { error: updateError } = await supabase
                .from('media')
                .update({ 
                  caption: newCaption,
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
        console.error(`Error processing chat ${chatId}:`, error);
        errors.push({ chatId, error: error.message });
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
        details: { results, errors }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-media-captions function:', error);

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