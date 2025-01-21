import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateWebhookSecret, corsHeaders } from "./utils/security.ts";
import { handleChannel } from "./utils/channelHandler.ts";
import { processMedia } from "./utils/mediaProcessor.ts";
import { createMessageRecord } from "./utils/messageHandler.ts";
import { logOperation } from "../_shared/database.ts";
import { forwardUpdate } from "./utils/forwardHandler.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log("[telegram-webhook] Starting webhook processing");
    console.log("[telegram-webhook] Request headers:", Array.from(req.headers.entries()));
    
    const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!webhookSecret || !botToken) {
      console.error('[telegram-webhook] Missing required environment variables');
      throw new Error('Missing required environment variables');
    }

    // Enhanced webhook secret validation with detailed logging
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
    
    // Handle both channel posts and regular messages
    const message = update.message || update.channel_post;
    if (!message) {
      throw new Error('No message in update');
    }

    // Log message details
    console.log("[telegram-webhook] Processing message:", {
      message_id: message.message_id,
      chat_id: message.chat.id,
      chat_type: message.chat.type,
      has_photo: !!message.photo,
      has_video: !!message.video,
      has_document: !!message.document,
      has_animation: !!message.animation,
      media_group_id: message.media_group_id
    });

    // Set default user ID for all users
    const userId = 'system';

    // Handle channel
    await handleChannel(supabaseClient, message);

    // Process media if present
    const mediaResult = await processMedia(supabaseClient, message, botToken, userId);

    // Create message record
    await createMessageRecord(supabaseClient, message, mediaResult);

    // Forward update if needed
    const forwardResult = await forwardUpdate(supabaseClient, update, message, mediaResult);

    // Log success
    await logOperation(
      supabaseClient,
      'telegram-webhook',
      'success',
      `Successfully processed message ${message.message_id} from chat ${message.chat.id}`
    );

    return new Response(
      JSON.stringify({ 
        status: 'success',
        message: 'Webhook processed successfully',
        details: {
          message_id: message.message_id,
          chat_id: message.chat.id,
          chat_type: message.chat.type,
          has_media: !!mediaResult,
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