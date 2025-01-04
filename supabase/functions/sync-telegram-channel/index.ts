import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processMediaMessage } from "./utils/mediaProcessor.ts";
import { logError, logSuccess, logInfo } from "./utils/errorHandler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { chatIds } = await req.json();
    
    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      throw new Error('Invalid or missing chatIds array');
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const results = [];
    const errors = [];
    let totalProcessed = 0;
    let totalErrors = 0;

    // Process each channel
    for (const channelId of chatIds) {
      try {
        await logInfo(supabase, `Starting sync for channel ${channelId}`);

        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/getUpdates?chat_id=${channelId}&limit=100`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.ok) {
          throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
        }

        // Process messages with media
        for (const update of data.result) {
          const message = update.message || update.channel_post;
          if (message && (message.photo || message.video || message.document)) {
            try {
              const result = await processMediaMessage(message, channelId, supabase, botToken);
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

        await logSuccess(supabase, `Successfully synced channel: ${channelId}`);

      } catch (error) {
        totalErrors++;
        errors.push({
          channelId,
          error: error.message
        });

        await logError(supabase, error, `processing channel ${channelId}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        errors: totalErrors,
        details: { results, errors }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: totalErrors > 0 ? 207 : 200
      }
    );

  } catch (error) {
    console.error('Error in sync-telegram-channel function:', error);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await logError(supabase, error, 'sync-telegram-channel');

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
        status: 400
      }
    );
  }
});