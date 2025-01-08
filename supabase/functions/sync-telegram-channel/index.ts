import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyChannelAccess, getAllChannelMessages } from "./utils/channelOperations.ts";
import { processMediaMessage } from "./utils/mediaProcessor.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request content type
    if (req.headers.get("content-type") !== "application/json") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Content-Type must be application/json" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { chatId } = await req.json();
    
    if (!chatId) {
      throw new Error('Invalid or missing chatId');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Starting sync for channel ${chatId}`);
    
    // Create sync session
    const { data: syncSession, error: sessionError } = await supabase
      .from('sync_sessions')
      .insert({
        channel_id: chatId,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create sync session: ${sessionError.message}`);
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    // Verify channel access
    await verifyChannelAccess(botToken, chatId);

    // Get all messages
    const messages = await getAllChannelMessages(botToken, chatId);
    
    if (!messages || messages.length === 0) {
      console.log('No messages found in channel');
      throw new Error('No messages found in channel');
    }

    let totalProcessed = 0;
    let totalErrors = 0;
    const errors = [];

    for (const message of messages) {
      if (message.photo || message.video || message.document) {
        try {
          const result = await processMediaMessage(message, chatId, supabase, botToken);
          if (result) {
            totalProcessed++;
          }
          
          // Update sync progress
          await supabase
            .from('sync_sessions')
            .update({
              progress: { processed: totalProcessed, total: messages.length },
              updated_at: new Date().toISOString()
            })
            .eq('id', syncSession.id);

        } catch (error) {
          console.error(`Error processing message ${message.message_id}:`, error);
          totalErrors++;
          errors.push({
            messageId: message.message_id,
            error: error.message
          });

          // Log error
          await supabase
            .from('sync_logs')
            .insert({
              session_id: syncSession.id,
              type: 'error',
              message: `Error processing message ${message.message_id}: ${error.message}`,
              metadata: {
                messageId: message.message_id,
                error: error.message,
                stack: error.stack
              }
            });
        }
      }
    }

    // Update final sync status
    await supabase
      .from('sync_sessions')
      .update({
        status: totalErrors > 0 ? 'completed_with_errors' : 'completed',
        completed_at: new Date().toISOString(),
        final_count: totalProcessed,
        progress: {
          processed: totalProcessed,
          total: messages.length,
          errors: totalErrors
        }
      })
      .eq('id', syncSession.id);

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        errors: totalErrors,
        details: errors,
        sessionId: syncSession.id
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