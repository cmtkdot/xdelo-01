import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId, messageId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log the start of the operation
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'sync-media-captions',
        status: 'info',
        message: `Starting caption sync for message ${messageId} in chat ${chatId}`
      });

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    // Fetch message from Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMessages?chat_id=${chatId}&message_ids=${messageId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch message from Telegram: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.ok || !data.result || !data.result[0]) {
      throw new Error('Invalid response from Telegram API');
    }

    const message = data.result[0];
    const caption = message.caption || null;

    // Update the media record
    const { error: updateError } = await supabase
      .from('media')
      .update({ 
        caption,
        updated_at: new Date().toISOString()
      })
      .eq('chat_id', chatId)
      .contains('metadata', { message_id: messageId });

    if (updateError) throw updateError;

    // Log success
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'sync-media-captions',
        status: 'success',
        message: `Successfully synced caption for message ${messageId}`
      });

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error in sync-media-captions function:', error);

    // Log error
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'sync-media-captions',
        status: 'error',
        message: `Error: ${error.message}`
      });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});