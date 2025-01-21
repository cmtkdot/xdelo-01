import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { validateWebhookSecret } from "../_shared/telegram.ts";
import { processMedia } from "./utils/mediaProcessor.ts";
import { handleChannel } from "./utils/channelHandler.ts";
import { handleMessage } from "./utils/messageHandler.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const update = await req.json();
    console.log('[webhook] Received update:', JSON.stringify(update));

    // Validate webhook secret
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');
    const isValid = await validateWebhookSecret(secret);
    
    if (!isValid) {
      console.error('[webhook] Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the message from different possible update types
    const message = update.message || update.edited_message || update.channel_post || update.edited_channel_post;
    
    if (!message) {
      console.error('[webhook] No message found in update');
      throw new Error('No message found in update');
    }

    // Handle channel first
    await handleChannel(supabaseClient, message);

    // Handle media if present
    if (message.photo || message.video || message.document || message.animation) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (!botToken) {
        throw new Error('Bot token not configured');
      }

      await processMedia(supabaseClient, message, botToken, message.from?.id.toString() || 'system');
    }

    // Always handle the message itself
    await handleMessage(supabaseClient, message);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[webhook] Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});