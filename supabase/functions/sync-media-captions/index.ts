import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { logOperation } from "../_shared/database.ts";
import { getMediaGroups, updateMediaGroupCaptions } from "./utils/mediaGroups.ts";
import { validateRequest, validateMediaGroup } from "./utils/validation.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    validateRequest(req);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await logOperation(
      supabase,
      'sync-media-captions',
      'info',
      'Starting media group caption sync'
    );

    const groupedMedia = await getMediaGroups(supabase);
    const results = [];
    const errors = [];

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    // Process each media group
    for (const [groupId, mediaGroup] of Object.entries(groupedMedia)) {
      try {
        validateMediaGroup(mediaGroup);
        
        // Get the first message from the group to fetch caption
        const firstMedia = mediaGroup[0];
        const chatId = firstMedia.chat_id;
        const messageId = firstMedia.metadata.message_id;

        console.log(`Fetching message ${messageId} from chat ${chatId} for group ${groupId}`);

        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/getMessages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId,
              message_ids: [messageId]
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch message: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.ok) {
          throw new Error('Invalid response from Telegram API');
        }

        const caption = data.result[0]?.caption || null;
        
        // Update all media in the group with the same caption
        const updated = await updateMediaGroupCaptions(supabase, groupId, caption);
        
        if (updated) {
          results.push({ groupId, status: 'updated', mediaCount: mediaGroup.length });
        } else {
          errors.push({ groupId, error: 'Failed to update captions' });
        }

      } catch (error) {
        console.error(`Error processing group ${groupId}:`, error);
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
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error in sync-media-captions:', error);
    
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
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: error.message.includes('Content-Type') ? 400 : 500
      }
    );
  }
});