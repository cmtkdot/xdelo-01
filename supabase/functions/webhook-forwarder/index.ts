import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processMediaMessage } from "./utils/mediaProcessor.ts";
import { handleChannelUpdate } from "./utils/channelHandler.ts";
import { handleUserUpdate } from "./utils/userHandler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log("[webhook-forwarder] Starting webhook processing");
    
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!telegramBotToken) {
      throw new Error('Missing TELEGRAM_BOT_TOKEN');
    }

    const update = await req.json();
    console.log("[webhook-forwarder] Received update:", JSON.stringify(update));
    
    // Handle both channel posts and regular messages
    const message = update.message || update.channel_post;
    if (!message) {
      throw new Error('No message in update');
    }

    // Log message details
    console.log("[webhook-forwarder] Processing message:", {
      message_id: message.message_id,
      chat_id: message.chat.id,
      chat_type: message.chat.type,
      has_photo: !!message.photo,
      has_video: !!message.video,
      has_document: !!message.document,
      has_animation: !!message.animation,
      media_group_id: message.media_group_id
    });

    // Handle channel update first
    const channelResult = await handleChannelUpdate(supabaseClient, message);
    if (channelResult.error) {
      throw new Error(`Channel handling error: ${channelResult.error}`);
    }

    // Handle user update if it's a user message
    if (message.from) {
      const userResult = await handleUserUpdate(supabaseClient, message.from);
      if (userResult.error) {
        console.error('[webhook-forwarder] Error handling user:', userResult.error);
      }
    }

    // Process media if present
    let mediaResult = null;
    if (message.photo || message.video || message.document || message.animation) {
      console.log("[webhook-forwarder] Processing media message");
      mediaResult = await processMediaMessage(supabaseClient, message, telegramBotToken);
      
      if (mediaResult.error) {
        throw new Error(`Media processing error: ${mediaResult.error}`);
      }
    }

    // Insert message record
    const { error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        chat_id: message.chat.id,
        message_id: message.message_id,
        sender_name: message.from?.first_name || message.chat.title || 'Unknown',
        text: message.caption || message.text,
        user_id: message.from?.id ? message.from.id.toString() : null,
        media_type: mediaResult?.mediaType || null,
        media_url: mediaResult?.publicUrl || null,
        public_url: mediaResult?.publicUrl || null,
        created_at: new Date(message.date * 1000).toISOString()
      });

    if (messageError) {
      throw new Error(`Message insert error: ${messageError.message}`);
    }

    // Log success to edge_function_logs
    await supabaseClient
      .from('edge_function_logs')
      .insert({
        function_name: 'webhook-forwarder',
        status: 'success',
        message: `Successfully processed message ${message.message_id} from chat ${message.chat.id}`
      });

    return new Response(
      JSON.stringify({ 
        status: 'success',
        message: 'Webhook processed successfully',
        details: {
          message_id: message.message_id,
          chat_id: message.chat.id,
          chat_type: message.chat.type,
          has_media: !!(message.photo || message.video || message.document || message.animation),
          media_result: mediaResult
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[webhook-forwarder] Error:', error);
    
    // Log error to edge_function_logs
    await supabaseClient
      .from('edge_function_logs')
      .insert({
        function_name: 'webhook-forwarder',
        status: 'error',
        message: `Error: ${error.message}`
      });

    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});