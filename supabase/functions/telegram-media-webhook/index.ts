import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateWebhookSecret, corsHeaders } from "./utils/security.ts";
import { handleChannel } from "./utils/channelHandler.ts";
import { processMedia } from "./utils/mediaProcessor.ts";
import { queueMessage, startMessageProcessor } from "./utils/messageHandler.ts";
import { logOperation } from "../_shared/database.ts";
import { forwardUpdate } from "./utils/forwardHandler.ts";

// Initialize message processor
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);
startMessageProcessor(supabaseClient);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[telegram-webhook] Starting webhook processing");
    console.log("[telegram-webhook] Request headers:", Array.from(req.headers.entries()));
    
    const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!webhookSecret || !botToken) {
      console.error('[telegram-webhook] Missing required environment variables');
      throw new Error('Missing required environment variables');
    }

    if (!validateWebhookSecret(req.headers, webhookSecret)) {
      console.error('[telegram-webhook] Invalid webhook secret');
      await logOperation(
        supabaseClient,
        'telegram-webhook',
        'error',
        'Invalid webhook secret token provided'
      );
      return new Response(
        JSON.stringify({ 
          error: 'Invalid webhook secret',
          message: 'Please provide the correct webhook secret token in x-telegram-bot-api-secret-token header'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const update = await req.json();
    console.log("[telegram-webhook] Received update:", JSON.stringify(update));
    
    // Handle all possible message types
    const message = update.message || 
                   update.edited_message || 
                   update.channel_post || 
                   update.edited_channel_post;

    if (!message) {
      console.log("[telegram-webhook] No message content in update");
      return new Response(
        JSON.stringify({ status: 'success', message: 'No message content to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set default user ID for all users
    const userId = 'system';

    // Handle channel
    await handleChannel(supabaseClient, message);

    // Process media if present
    const mediaResult = await processMedia(supabaseClient, message, botToken, userId);

    // Queue message for processing instead of immediate processing
    queueMessage(message, mediaResult);

    // Forward update if needed
    const forwardResult = await forwardUpdate(supabaseClient, update, message, mediaResult);

    // Log success
    await logOperation(
      supabaseClient,
      'telegram-webhook',
      'success',
      `Successfully queued message ${message.message_id} from chat ${message.chat.id}`
    );

    return new Response(
      JSON.stringify({ 
        status: 'success',
        message: 'Message queued for processing',
        details: {
          message_id: message.message_id,
          chat_id: message.chat.id,
          chat_type: message.chat.type,
          has_media: !!mediaResult,
          is_edited: !!update.edited_message || !!update.edited_channel_post,
          media_result: mediaResult,
          forward_result: forwardResult
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('[telegram-webhook] Error:', error);
    
    await logOperation(
      supabaseClient,
      'telegram-webhook',
      'error',
      `Error: ${error.message}`
    );

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});