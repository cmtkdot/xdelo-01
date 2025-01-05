import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyChannelAccess } from "./utils/telegramApi.ts";
import { getAllChannelMessages, processMessage } from "./utils/messageRetrieval.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { chatId } = await req.json();
    
    if (!chatId) {
      throw new Error('Invalid or missing chatId');
    }

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
    
    // Handle case where no messages are found - this is not an error
    if (!messages || messages.length === 0) {
      console.log('No messages found in channel');
      
      // Update sync session to completed with 0 messages
      await supabase
        .from('sync_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          final_count: 0,
          progress: {
            processed: 0,
            total: 0,
            errors: 0
          }
        })
        .eq('id', syncSession.id);

      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No messages found in channel'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    let totalProcessed = 0;
    let totalErrors = 0;
    const errors = [];

    for (const message of messages) {
      if (message.photo || message.video || message.document) {
        try {
          const result = await processMessage(message, chatId, supabase, botToken);
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