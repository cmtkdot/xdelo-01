import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { logOperation } from "../_shared/database.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { chatId, messageId } = await req.json();
    
    if (!chatId || !messageId) {
      throw new Error('Missing required parameters: chatId and messageId');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await logOperation(
      supabase,
      'sync-media-captions',
      'info',
      `Starting caption sync for message ${messageId} in chat ${chatId}`
    );

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

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

    const { error: updateError } = await supabase
      .from('media')
      .update({ 
        caption,
        updated_at: new Date().toISOString()
      })
      .eq('chat_id', chatId)
      .contains('metadata', { message_id: messageId });

    if (updateError) throw updateError;

    await logOperation(
      supabase,
      'sync-media-captions',
      'success',
      `Successfully synced caption for message ${messageId}`
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-media-captions function:', error);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await logOperation(
      supabase,
      'sync-media-captions',
      'error',
      `Error: ${error.message}`
    );

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