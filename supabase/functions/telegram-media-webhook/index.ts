import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleMediaUpload } from "./handlers/mediaHandler.ts";
import { saveChannel, saveMessage } from "./utils/database.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const payload = await req.json();
    console.log('Received webhook payload:', payload);

    const message = payload.message || payload.channel_post;
    if (!message) {
      console.log('No message content found in payload');
      return new Response(
        JSON.stringify({ success: true, message: "No content to process" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    // Generate a random UUID for the user_id if not available
    const userId = crypto.randomUUID();

    // Process operations in parallel to reduce stack depth
    const [channelResult, messageResult, mediaResult] = await Promise.all([
      // Save channel information
      message.chat ? saveChannel(supabase, message.chat, userId) : Promise.resolve(null),
      
      // Save the message
      saveMessage(supabase, message.chat, message, userId),
      
      // Handle media content if present
      (message.photo || message.video || message.document) ? 
        handleMediaUpload(supabase, message, userId, botToken) : 
        Promise.resolve(null)
    ]);

    // Log success without nesting
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'telegram-media-webhook',
        status: 'success',
        message: `Successfully processed message ${message.message_id}`
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: mediaResult?.mediaData,
        message: mediaResult ? "Media processed successfully" : "Message processed successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);

    // Log error without nesting
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'telegram-media-webhook',
        status: 'error',
        message: `Error: ${error.message}`
      });

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