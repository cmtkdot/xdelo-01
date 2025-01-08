import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { logOperation } from "../_shared/database.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Parse request body
    const requestText = await req.text();
    if (!requestText) {
      throw new Error('Empty request body');
    }

    const { chatIds } = JSON.parse(requestText);
    if (!chatIds?.length) {
      throw new Error('No chat IDs provided');
    }

    console.log('Processing chat IDs:', chatIds);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await logOperation(
      supabase,
      'sync-media-captions',
      'info',
      `Starting caption sync for channels: ${chatIds.join(', ')}`
    );

    // Fetch media records that need caption sync
    const { data: mediaRecords, error: fetchError } = await supabase
      .from('media')
      .select('*')
      .in('chat_id', chatIds)
      .not('metadata', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!mediaRecords?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No media records found to process'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group media by media_group_id
    const mediaGroups = mediaRecords.reduce((acc, media) => {
      const groupId = media.media_group_id || media.id;
      if (!acc[groupId]) {
        acc[groupId] = [];
      }
      acc[groupId].push(media);
      return acc;
    }, {} as Record<string, typeof mediaRecords>);

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const results = [];
    const errors = [];

    // Process each media group
    for (const [groupId, groupMedia] of Object.entries(mediaGroups)) {
      try {
        const chatId = groupMedia[0].chat_id;
        if (!chatId) continue;

        // Get all message IDs for this group
        const messageIds = [...new Set(groupMedia
          .map(m => m.metadata?.message_id)
          .filter(Boolean))];

        if (messageIds.length === 0) continue;

        console.log(`Fetching ${messageIds.length} messages for chat ${chatId} in group ${groupId}`);

        // Fetch messages from Telegram
        const messages = await Promise.all(messageIds.map(async (messageId) => {
          const response = await fetch(
            `https://api.telegram.org/bot${botToken}/getMessages?chat_id=${chatId}&message_id=${messageId}`
          );
          
          if (!response.ok) {
            throw new Error(`Failed to fetch message ${messageId}: ${response.statusText}`);
          }

          return response.json();
        }));

        // Create caption map from messages
        const captionMap = messages.reduce((map, msg) => {
          if (msg.ok && msg.result?.caption) {
            map[msg.result.message_id] = msg.result.caption;
          }
          return map;
        }, {} as Record<number, string>);

        // For media groups, use the first non-empty caption as the group caption
        const groupCaption = groupMedia.length > 1 
          ? Object.values(captionMap).find(caption => caption && caption.trim() !== '') || null
          : captionMap[messageIds[0]];

        // Update all media items in the group
        for (const media of groupMedia) {
          try {
            const messageId = media.metadata?.message_id;
            if (!messageId) continue;

            const newCaption = groupMedia.length > 1 ? groupCaption : captionMap[messageId];
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
              
              console.log(`Updated caption for media ${media.id} in group ${groupId}`);
              results.push({ id: media.id, status: 'updated', groupId });
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