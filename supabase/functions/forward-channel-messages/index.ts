import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyChannelAccess, forwardMessage } from "../sync-telegram-channel/utils/telegramApi.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sourceChatId, destinationChatId } = await req.json();
    
    if (!sourceChatId || !destinationChatId) {
      return new Response(
        JSON.stringify({ error: 'Source and destination chat IDs are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    // Verify access to both channels
    await verifyChannelAccess(botToken, sourceChatId);
    await verifyChannelAccess(botToken, destinationChatId);

    // Get messages from source channel
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', sourceChatId)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    const results = [];
    for (const message of messages) {
      try {
        const forwardedMessage = await forwardMessage(
          botToken,
          sourceChatId,
          destinationChatId,
          message.message_id
        );
        
        results.push({
          original_message_id: message.message_id,
          forwarded_message_id: forwardedMessage.message_id,
          status: 'success'
        });
      } catch (error) {
        console.error(`Failed to forward message ${message.message_id}:`, error);
        results.push({
          original_message_id: message.message_id,
          error: error.message,
          status: 'error'
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in forward-channel-messages:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});