import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { logOperation } from "../_shared/database.ts";
import { verifyChannelAccess, getChannelMessages } from "./utils/channelOperations.ts";
import { processMediaMessage } from "./utils/mediaProcessor.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { chatId } = await req.json();
    
    if (!chatId) {
      throw new Error('Invalid or missing chatId');
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    let totalProcessed = 0;
    let totalErrors = 0;
    const errors = [];
    const results = [];

    try {
      await logOperation(supabaseClient, 'sync-telegram-channel', 'info', `Starting sync for channel ${chatId}`);

      // Verify channel access
      await verifyChannelAccess(botToken, chatId);

      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        console.log(`Fetching messages from offset ${offset}`);
        
        const historyData = await getChannelMessages(botToken, chatId, offset, limit);
        const messages = historyData.result || [];

        if (!messages || messages.length === 0) {
          hasMore = false;
          continue;
        }

        for (const message of messages) {
          if (message.photo || message.video || message.document) {
            try {
              const result = await processMediaMessage(message, chatId, supabaseClient, botToken);
              if (result) {
                results.push(result);
                totalProcessed++;
              }
            } catch (error) {
              console.error(`Error processing message ${message.message_id}:`, error);
              totalErrors++;
              errors.push({
                messageId: message.message_id,
                error: error.message
              });
            }
          }
        }

        offset += messages.length;
        if (messages.length < limit) {
          hasMore = false;
        }

        // Add a small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await logOperation(
        supabaseClient, 
        'sync-telegram-channel', 
        'success', 
        `Successfully synced channel ${chatId}: processed ${totalProcessed} items with ${totalErrors} errors`
      );

    } catch (error) {
      console.error(`Error processing channel ${chatId}:`, error);
      totalErrors++;
      errors.push({
        chatId,
        error: error.message
      });

      await logOperation(
        supabaseClient, 
        'sync-telegram-channel', 
        'error', 
        `Error processing channel ${chatId}: ${error.message}`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        errors: totalErrors,
        details: { results, errors }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: totalErrors > 0 ? 207 : 200
      }
    );

  } catch (error) {
    console.error('Error in sync-telegram-channel function:', error);
    
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