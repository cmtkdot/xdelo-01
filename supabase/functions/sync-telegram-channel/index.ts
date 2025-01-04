import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { logOperation } from "../_shared/database.ts";
import { getAndDownloadTelegramFile } from "../_shared/telegram.ts";
import { uploadToStorage, generateSafeFileName } from "../_shared/storage.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { chatId } = await req.json();
    
    if (!chatId) {
      throw new Error('Invalid or missing chatId');
    }

    console.log(`Starting sync for channel ${chatId}`);
    
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    let totalProcessed = 0;
    let totalErrors = 0;
    const errors = [];
    const results = [];

    try {
      await logOperation(supabaseClient, 'sync-telegram-channel', 'info', `Starting sync for channel ${chatId}`);

      // Update sync status
      await supabaseClient
        .from('sync_logs')
        .insert({
          channel_id: chatId,
          sync_type: 'telegram_channel',
          status: 'in_progress',
          progress: 0
        });

      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        console.log(`Fetching messages from offset ${offset}`);
        
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/getUpdates?chat_id=${chatId}&offset=${offset}&limit=${limit}`
        );

        if (!response.ok) {
          const error = await response.json();
          console.error('Error fetching messages:', error);
          throw new Error(`Failed to fetch messages: ${error.description}`);
        }

        const data = await response.json();
        const messages = data.result || [];
        console.log(`Received ${messages.length} messages`);

        if (!messages || messages.length === 0) {
          console.log('No more messages to process');
          hasMore = false;
          continue;
        }

        for (const update of messages) {
          const message = update.message || update.channel_post;
          if (!message) continue;

          if (message.photo || message.video || message.document) {
            try {
              console.log(`Processing message ${message.message_id}`);
              
              const mediaItem = message.photo 
                ? message.photo[message.photo.length - 1] 
                : message.video || message.document;

              if (!mediaItem) continue;

              // Check if media already exists
              const { data: existingMedia } = await supabaseClient
                .from('media')
                .select('id')
                .eq('metadata->file_unique_id', mediaItem.file_unique_id)
                .single();

              if (existingMedia) {
                console.log(`Media item already exists: ${existingMedia.id}`);
                continue;
              }

              // Download and process new media
              const { buffer, filePath } = await getAndDownloadTelegramFile(
                mediaItem.file_id,
                botToken
              );

              const timestamp = Date.now();
              const fileName = generateSafeFileName(
                `${mediaItem.file_unique_id}_${timestamp}`,
                filePath.split('.').pop() || 'unknown'
              );

              const mediaType = message.photo 
                ? 'photo' 
                : (message.video ? 'video' : 'document');

              const publicUrl = await uploadToStorage(
                supabaseClient,
                fileName,
                buffer,
                mediaType === 'photo' ? 'image/jpeg' : 'application/octet-stream'
              );

              const metadata = {
                file_id: mediaItem.file_id,
                file_unique_id: mediaItem.file_unique_id,
                message_id: message.message_id,
                media_group_id: message.media_group_id,
                file_size: mediaItem.file_size,
                file_path: filePath
              };

              const { data: mediaData, error: mediaError } = await supabaseClient
                .from('media')
                .insert({
                  user_id: crypto.randomUUID(),
                  chat_id: chatId,
                  file_name: fileName,
                  file_url: publicUrl,
                  media_type: mediaType,
                  caption: message.caption,
                  metadata,
                  media_group_id: message.media_group_id,
                  public_url: publicUrl
                })
                .select()
                .single();

              if (mediaError) throw mediaError;

              results.push({ mediaData, publicUrl });
              totalProcessed++;
              
              // Update sync progress
              await supabaseClient
                .from('sync_logs')
                .update({
                  progress: Math.round((totalProcessed / messages.length) * 100),
                  details: { processed: totalProcessed, errors: totalErrors }
                })
                .eq('channel_id', chatId)
                .eq('status', 'in_progress');

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

        offset = messages[messages.length - 1].update_id + 1;
        if (messages.length < limit) {
          hasMore = false;
        }

        // Add a small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update final sync status
      await supabaseClient
        .from('sync_logs')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          details: { processed: totalProcessed, errors: totalErrors }
        })
        .eq('channel_id', chatId)
        .eq('status', 'in_progress');

      await logOperation(
        supabaseClient, 
        'sync-telegram-channel', 
        'success', 
        `Successfully synced channel ${chatId}: processed ${totalProcessed} items with ${totalErrors} errors`
      );

    } catch (error) {
      console.error(`Error processing channel ${chatId}:`, error);
      
      await supabaseClient
        .from('sync_logs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('channel_id', chatId)
        .eq('status', 'in_progress');

      totalErrors++;
      errors.push({
        chatId,
        error: error.message
      });

      await logOperation(
        supabaseClient, 
        'sync-telegram-channel', 
        'error', 
        `Error processing channel ${chatId}: ${error.message}`
      );
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