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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!telegramBotToken) {
      throw new Error('Missing TELEGRAM_BOT_TOKEN');
    }

    const update = await req.json();
    const message = update.message || update.channel_post;
    
    if (!message) {
      console.error('No message in update:', update);
      return new Response(
        JSON.stringify({ error: 'No message in update' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Handle channel update
    const channelResult = await handleChannelUpdate(supabaseClient, message);
    if (channelResult.error) {
      console.error('[webhook-forwarder] Error handling channel:', channelResult.error);
      return new Response(
        JSON.stringify({ error: channelResult.error }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Handle user update if it's a user message
    if (message.from) {
      const userResult = await handleUserUpdate(supabaseClient, message.from);
      if (userResult.error) {
        console.error('[webhook-forwarder] Error handling user:', userResult.error);
      }
    }

    // Process media if present
    if (message.photo || message.video || message.document) {
      const result = await processMediaMessage(supabaseClient, message, telegramBotToken);
      
      if (result.error) {
        console.error('[webhook-forwarder] Error processing media:', result.error);
        return new Response(
          JSON.stringify({ error: result.error, details: result.details }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('[webhook-forwarder] Successfully processed media:', {
        id: result.mediaId,
        channelId: channelResult.channelId
      });
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
        created_at: new Date(message.date * 1000).toISOString()
      });

    if (messageError) {
      console.error('[webhook-forwarder] Error inserting message:', messageError);
    }

    return new Response(
      JSON.stringify({ 
        status: 'success',
        message: 'Webhook processed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[webhook-forwarder] Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});