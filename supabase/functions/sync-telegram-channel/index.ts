import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { logOperation } from "../_shared/database.ts";
import { getAllChannelMessages, verifyChannelAccess, getMessageHistory } from "./utils/channelOperations.ts";
import { processMediaMessage } from "./utils/mediaProcessor.ts";
import { logError, logSuccess, logInfo } from "./utils/errorHandler.ts";

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

    console.log(`Starting sync for channel ${chatId}`);
    
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    let totalProcessed = 0;
    let totalErrors = 0;
    const errors = [];
    const results = [];

    try {
      await logInfo(supabaseClient, `Starting sync for channel ${chatId}`);

      // Update sync status
      await supabaseClient
        .from('sync_logs')
        .insert({
          channel_id: chatId,
          sync_type: 'telegram_channel',
          status: 'in_progress',
          progress: 0
        });

      // Verify channel access
      await verifyChannelAccess(botToken, chatId);

      // Try to get message history first
      let messages = await getMessageHistory(botToken, chatId);
      
      // If message history fails, fall back to getting all messages
      if (!messages) {
        console.log('Falling back to getAllChannelMessages');
        messages = await getAllChannelMessages(botToken, chatId);
      }
      
      if (!messages || messages.length === 0) {
        console.log('No messages found in channel');
        throw new Error('No messages found in channel');
      }

      for (const message of messages) {
        if (message.photo || message.video || message.document) {
          try {
            const result = await processMediaMessage(message, chatId, supabaseClient, botToken);
            if (result) {
              results.push(result);
              totalProcessed++;
            }
            
            // Update sync progress
            await supabaseClient
              .from('sync_logs')
              .update({
                progress: Math.round((totalProcessed / messages.length) * 100),
                details: { processed: totalProcessed, errors: totalErrors }
              })
              .eq('channel_id', chatId)
              .eq('status', 'in_progress');

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

      // Update final sync status
      await supabaseClient
        .from('sync_logs')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          details: { processed: totalProcessed, errors: totalErrors }
        })
        .eq('channel_id', chatId)
        .eq('status', 'in_progress');

      await logSuccess(supabaseClient, 
        `Successfully synced channel ${chatId}: processed ${totalProcessed} items with ${totalErrors} errors`
      );

    } catch (error) {
      console.error(`Error processing channel ${chatId}:`, error);
      
      await supabaseClient
        .from('sync_logs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('channel_id', chatId)
        .eq('status', 'in_progress');

      totalErrors++;
      errors.push({
        chatId,
        error: error.message
      });

      await logError(supabaseClient, error, `Error processing channel ${chatId}`);
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