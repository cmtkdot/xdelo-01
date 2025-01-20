import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateWebhookSecret } from "./utils/security.ts";
import { handleChannel } from "./utils/channelHandler.ts";
import { processMedia } from "./utils/mediaProcessor.ts";
import { createMessageRecord } from "./utils/messageHandler.ts";
import { logOperation } from "../_shared/database.ts";

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log("[telegram-media-webhook] Starting webhook processing");
    
    const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!webhookSecret || !botToken) {
      throw new Error('Missing required environment variables');
    }

    // Validate webhook secret
    if (!validateWebhookSecret(req.headers, webhookSecret)) {
      throw new Error('Invalid webhook secret');
    }

    const update = await req.json();
    console.log("[telegram-media-webhook] Received update:", JSON.stringify(update));
    
    // Handle both channel posts and regular messages
    const message = update.message || update.channel_post;
    if (!message) {
      throw new Error('No message in update');
    }

    // Log message details
    console.log("[telegram-media-webhook] Processing message:", {
      message_id: message.message_id,
      chat_id: message.chat.id,
      chat_type: message.chat.type,
      has_photo: !!message.photo,
      has_video: !!message.video,
      has_document: !!message.document,
      has_animation: !!message.animation,
      media_group_id: message.media_group_id
    });

    // Set default user ID
    let userId = 'system';
    if (message.from) {
      const { data: user } = await supabaseClient
        .from('bot_users')
        .select('id')
        .eq('telegram_user_id', message.from.id.toString())
        .maybeSingle();
      
      if (user) {
        userId = user.id;
      }
    }

    // Handle channel
    await handleChannel(supabaseClient, message);

    // Process media if present
    const mediaResult = await processMedia(supabaseClient, message, botToken, userId);

    // Create message record
    await createMessageRecord(supabaseClient, message, mediaResult);

    // Log success
    await logOperation(
      supabaseClient,
      'telegram-media-webhook',
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
          media_result: mediaResult
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[telegram-media-webhook] Error:', error);
    
    await logOperation(
      supabaseClient,
      'telegram-media-webhook',
      'error',
      `Error: ${error.message}`
    );

    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});