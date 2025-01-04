import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { logOperation } from "../_shared/database.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { chatIds, mediaGroupId } = await req.json();
    
    if (!chatIds?.length && !mediaGroupId) {
      throw new Error('Please provide either chatIds array or mediaGroupId');
    }

    await logOperation(
      supabase,
      'sync-media-captions',
      'info',
      `Starting caption sync for ${mediaGroupId ? 'media group: ' + mediaGroupId : 'channels: ' + chatIds.join(', ')}`
    );

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const results = [];
    const errors = [];

    // Query to get media records based on input parameters
    let mediaQuery = supabase
      .from('media')
      .select('*')
      .not('metadata', 'is', null);

    if (mediaGroupId) {
      mediaQuery = mediaQuery.eq('media_group_id', mediaGroupId);
      console.log(`Fetching media records for group ${mediaGroupId}`);
    } else {
      mediaQuery = mediaQuery.in('chat_id', chatIds);
      console.log(`Fetching media records for channels:`, chatIds);
    }

    const { data: mediaRecords, error: fetchError } = await mediaQuery;

    if (fetchError) throw fetchError;

    console.log(`Processing ${mediaRecords?.length || 0} media records`);

    // Group media records by chat_id for efficient processing
    const mediaByChat = mediaRecords?.reduce((acc, media) => {
      if (!media.chat_id) return acc;
      if (!acc[media.chat_id]) acc[media.chat_id] = [];
      acc[media.chat_id].push(media);
      return acc;
    }, {} as Record<number, typeof mediaRecords>);

    // Process each chat's media
    for (const [chatId, chatMedia] of Object.entries(mediaByChat || {})) {
      try {
        // Get unique message IDs for this chat
        const messageIds = [...new Set(chatMedia.map(m => 
          m.metadata?.message_id).filter(Boolean))];

        if (messageIds.length === 0) continue;

        console.log(`Fetching ${messageIds.length} messages for chat ${chatId}`);

        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/getMessages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId,
              message_ids: messageIds,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.ok || !data.result) continue;

        // Create a map of message_id to caption for efficient lookup
        const captionMap = data.result.reduce((acc: Record<number, string>, msg: any) => {
          if (msg.caption) acc[msg.message_id] = msg.caption;
          return acc;
        }, {});

        // Update captions for all media in this chat
        for (const media of chatMedia) {
          try {
            const messageId = media.metadata?.message_id;
            if (!messageId) continue;

            const newCaption = captionMap[messageId];
            if (newCaption === undefined) continue;

            // Only update if caption is different
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
        details: {
          results,
          errors
        }
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