import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { logOperation, createMediaRecord } from "../_shared/database.ts";
import { uploadToStorage, generateSafeFileName } from "../_shared/storage.ts";
import { getAndDownloadTelegramFile } from "../_shared/telegram.ts";
import { MediaMetadata } from "../_shared/types.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { chatIds } = await req.json();
    
    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      throw new Error('Invalid or missing chatIds array');
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const results = [];
    const errors = [];
    let totalProcessed = 0;
    let totalErrors = 0;

    for (const channelId of chatIds) {
      try {
        await logOperation(supabase, 'sync-telegram-channel', 'info', `Starting sync for channel ${channelId}`);

        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/getUpdates?chat_id=${channelId}&limit=100`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.ok) {
          throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
        }

        for (const update of data.result) {
          const message = update.message || update.channel_post;
          if (message && (message.photo || message.video || message.document)) {
            try {
              const mediaItem = message.photo 
                ? message.photo[message.photo.length - 1] 
                : message.video || message.document;

              const { buffer, filePath } = await getAndDownloadTelegramFile(mediaItem.file_id, botToken);
              
              const timestamp = Date.now();
              const fileName = generateSafeFileName(
                `${mediaItem.file_unique_id}_${timestamp}`,
                filePath.split('.').pop() || 'unknown'
              );

              const mediaType = message.photo ? 'image/jpeg' : (message.video ? 'video/mp4' : 'application/octet-stream');
              
              const publicUrl = await uploadToStorage(
                supabase,
                fileName,
                buffer,
                mediaType
              );

              const metadata: MediaMetadata = {
                file_id: mediaItem.file_id,
                file_unique_id: mediaItem.file_unique_id,
                message_id: message.message_id,
                media_group_id: message.media_group_id,
                content_type: mediaType,
                mime_type: mediaType,
                file_size: mediaItem.file_size,
                file_path: filePath
              };

              const mediaData = await createMediaRecord(
                supabase,
                crypto.randomUUID(), // This should be replaced with actual user ID in production
                message.chat.id,
                fileName,
                publicUrl,
                mediaType,
                message.caption,
                metadata,
                message.media_group_id,
                publicUrl
              );

              results.push({ mediaData, publicUrl });
              totalProcessed++;
            } catch (error) {
              console.error(`Error processing message ${message.message_id}:`, error);
              totalErrors++;
              errors.push({
                messageId: message.message_id,
                error: error.message
              });
            }
          }
        }

        await logOperation(supabase, 'sync-telegram-channel', 'success', `Successfully synced channel: ${channelId}`);

      } catch (error) {
        totalErrors++;
        errors.push({
          channelId,
          error: error.message
        });

        await logOperation(supabase, 'sync-telegram-channel', 'error', `Error processing channel ${channelId}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        errors: totalErrors,
        details: { results, errors }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: totalErrors > 0 ? 207 : 200
      }
    );

  } catch (error) {
    console.error('Error in sync-telegram-channel function:', error);
    await logOperation(supabase, 'sync-telegram-channel', 'error', `Global error: ${error.message}`);

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