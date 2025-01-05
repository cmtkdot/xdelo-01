import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyChannelAccess, forwardMessage } from "../sync-telegram-channel/utils/telegramApi.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceChatId, destinationChatId } = await req.json();
    
    if (!sourceChatId || !destinationChatId) {
      throw new Error('Source and destination chat IDs are required');
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Bot token not configured');
    }

    // Verify access to both channels
    await Promise.all([
      verifyChannelAccess(botToken, sourceChatId),
      verifyChannelAccess(botToken, destinationChatId)
    ]);

    // Get messages from source channel
    const messages = await getChannelMessages(botToken, sourceChatId);
    
    // Forward each message
    const results = await Promise.all(
      messages.map(msg => 
        forwardMessage(botToken, sourceChatId, destinationChatId, msg.message_id)
      )
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        results 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Error in forward-channel-messages:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});