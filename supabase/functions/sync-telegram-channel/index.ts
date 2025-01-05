import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyChannelAccess, getChannelMessages } from "./utils/telegramApi.ts";
import { uploadToStorage } from "../_shared/storage.ts";
import { getAndDownloadTelegramFile } from "../_shared/telegram.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { chatId } = await req.json();
    
    if (!chatId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or missing chatId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Starting sync for channel ${chatId}`);
    
    // Create sync session
    const { data: syncSession, error: sessionError } = await supabase
      .from('sync_sessions')
      .insert({
        channel_id: chatId,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create sync session: ${sessionError.message}`);
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    await verifyChannelAccess(botToken, chatId);
    const messages = await getChannelMessages(botToken, chatId);
    
    if (!messages || messages.length === 0) {
      await supabase
        .from('sync_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          final_count: 0,
          progress: { processed: 0, total: 0 }
        })
        .eq('id', syncSession.id);

      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No messages found in channel' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalProcessed = 0;
    let totalErrors = 0;
    const errors = [];

    for (const message of messages) {
      if (message.photo || message.video || message.document) {
        try {
          const mediaItem = message.photo 
            ? message.photo[message.photo.length - 1] 
            : message.video || message.document;

          const { buffer, filePath } = await getAndDownloadTelegramFile(
            mediaItem.file_id,
            botToken
          );

          const fileName = `${mediaItem.file_unique_id}_${Date.now()}.${filePath.split('.').pop() || 'unknown'}`;
          const mediaType = message.photo ? 'image/jpeg' : (message.video ? 'video/mp4' : 'application/octet-stream');

          const publicUrl = await uploadToStorage(supabase, fileName, buffer, mediaType);

          const { error: mediaError } = await supabase
            .from('media')
            .insert({
              user_id: crypto.randomUUID(),
              chat_id: chatId,
              file_name: fileName,
              file_url: publicUrl,
              media_type: mediaType,
              caption: message.caption,
              metadata: {
                file_id: mediaItem.file_id,
                file_unique_id: mediaItem.file_unique_id,
                message_id: message.message_id,
                media_group_id: message.media_group_id
              },
              public_url: publicUrl
            });

          if (mediaError) throw mediaError;
          totalProcessed++;
          
          await supabase
            .from('sync_sessions')
            .update({
              progress: { processed: totalProcessed, total: messages.length },
              updated_at: new Date().toISOString()
            })
            .eq('id', syncSession.id);

        } catch (error) {
          console.error(`Error processing message ${message.message_id}:`, error);
          totalErrors++;
          errors.push({ messageId: message.message_id, error: error.message });
        }
      }
    }

    await supabase
      .from('sync_sessions')
      .update({
        status: totalErrors > 0 ? 'completed_with_errors' : 'completed',
        completed_at: new Date().toISOString(),
        final_count: totalProcessed,
        progress: { processed: totalProcessed, total: messages.length, errors: totalErrors }
      })
      .eq('id', syncSession.id);

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        errors: totalErrors,
        details: errors,
        sessionId: syncSession.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-telegram-channel function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});