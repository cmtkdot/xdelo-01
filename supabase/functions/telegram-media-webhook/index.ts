import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { handleChannel } from "./utils/channelHandler.ts";
import { handleBotUser } from "./utils/botUserHandler.ts";
import { handleMedia } from "./utils/mediaProcessor.ts";
import { handleMessage } from "./utils/messageHandler.ts";
import { validateWebhookSecret } from "./utils/security.ts";
import { handleForward } from "./utils/forwardHandler.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const update = await req.json();
    console.log('Received webhook update:', JSON.stringify(update));

    // Validate webhook secret
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');
    const isValid = await validateWebhookSecret(secret);
    
    if (!isValid) {
      console.error('Invalid webhook secret');
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
      throw new Error('No message found in update');
    }

    // Handle channel first
    await handleChannel(supabaseClient, message);

    // Handle bot user if message is from a user (not a channel)
    if (message.from) {
      await handleBotUser(supabaseClient, message);
    }

    // Handle media if present
    if (message.photo || message.video || message.document || message.animation) {
      await handleMedia(supabaseClient, message);
    }

    // Handle forwarded messages
    if (message.forward_from || message.forward_from_chat) {
      await handleForward(supabaseClient, message);
    }

    // Always handle the message itself
    await handleMessage(supabaseClient, message);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});