import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    
    if (!botToken || !webhookSecret) {
      throw new Error('Missing required environment variables');
    }

    // Construct the webhook URL using your Supabase project URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-media-webhook`;

    // Set webhook URL with Telegram
    const setWebhookUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
    const response = await fetch(setWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ["message", "channel_post", "edited_message", "edited_channel_post"],
        drop_pending_updates: true
      })
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(`Failed to set webhook: ${result.description}`);
    }

    // Get webhook info to verify setup
    const getWebhookInfoUrl = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
    const webhookInfo = await fetch(getWebhookInfoUrl).then(res => res.json());

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook configured successfully',
        webhook_url: webhookUrl,
        webhook_info: webhookInfo
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error setting up webhook:', error);
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