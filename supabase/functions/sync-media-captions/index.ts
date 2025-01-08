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

    // Group media by media_group_id
    const mediaGroups = mediaRecords.reduce((acc, media) => {
      if (media.media_group_id) {
        if (!acc[media.media_group_id]) {
          acc[media.media_group_id] = [];
        }
        acc[media.media_group_id].push(media);
      } else {
        // For single media items, use their ID as key
        acc[media.id] = [media];
      }
      return acc;
    }, {} as Record<string, typeof mediaRecords>);

    const results = [];
    const errors = [];

    for (const [groupId, groupMedia] of Object.entries(mediaGroups)) {
      try {
        const chatId = groupMedia[0].chat_id;
        if (!chatId) continue;

        const messageIds = [...new Set(groupMedia
          .map(m => m.metadata?.message_id)
          .filter(Boolean))];

        if (messageIds.length === 0) continue;

        console.log(`Fetching ${messageIds.length} messages for chat ${chatId} in group ${groupId}`);
        const messages = await fetchTelegramMessages(botToken, chatId, messageIds);
        const captionMap = createCaptionMap(messages);

        // For media groups, we want to use the same caption across all items
        const groupCaption = Object.values(captionMap)[0];

        for (const media of groupMedia) {
          try {
            const messageId = media.metadata?.message_id;
            if (!messageId) continue;

            const newCaption = media.media_group_id ? groupCaption : captionMap[messageId];
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
        console.error(`Error processing media group ${groupId}:`, error);
        errors.push({ groupId, error: error.message });
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