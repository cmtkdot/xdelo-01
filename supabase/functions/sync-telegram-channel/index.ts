import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { logOperation } from "../_shared/database.ts";
import { uploadToStorage, generateSafeFileName } from "../_shared/storage.ts";
import { getAndDownloadTelegramFile } from "../_shared/telegram.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

        // First verify channel access using getChat
        const chatResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/getChat?chat_id=${channelId}`
        );
        
        if (!chatResponse.ok) {
          throw new Error(`Failed to access channel: ${chatResponse.statusText}`);
        }

        // Use getMessages method for channels
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
          console.log(`Fetching messages from offset ${offset}`);
          
          const historyResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/getMessages?chat_id=${channelId}&limit=${limit}&offset=${offset}`
          );

          if (!historyResponse.ok) {
            const errorData = await historyResponse.json();
            console.error('Telegram API error:', errorData);
            
            // If method not found, try alternative method for older messages
            if (errorData.error_code === 404) {
              const alternativeResponse = await fetch(
                `https://api.telegram.org/bot${botToken}/forwardMessages?chat_id=${channelId}&from_chat_id=${channelId}&message_ids=${Array.from({length: limit}, (_, i) => offset + i + 1).join(',')}`
              );
              
              if (!alternativeResponse.ok) {
                throw new Error(`Failed to fetch messages: ${alternativeResponse.statusText}`);
              }
            } else {
              throw new Error(`Failed to fetch messages: ${historyResponse.statusText}`);
            }
          }

          const historyData = await historyResponse.json();
          const messages = historyData.result || [];

          if (!messages || messages.length === 0) {
            hasMore = false;
            continue;
          }

          for (const message of messages) {
            if (message.photo || message.video || message.document) {
              try {
                const mediaItem = message.photo 
                  ? message.photo[message.photo.length - 1] 
                  : message.video || message.document;

                // Check if media already exists
                const { data: existingMedia } = await supabase
                  .from('media')
                  .select('id')
                  .eq('metadata->file_unique_id', mediaItem.file_unique_id)
                  .single();

                if (!existingMedia) {
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

                  const metadata = {
                    file_id: mediaItem.file_id,
                    file_unique_id: mediaItem.file_unique_id,
                    message_id: message.message_id,
                    media_group_id: message.media_group_id,
                    content_type: mediaType,
                    mime_type: mediaType,
                    file_size: mediaItem.file_size,
                    file_path: filePath
                  };

                  const { data: mediaData, error: mediaError } = await supabase
                    .from('media')
                    .insert({
                      user_id: crypto.randomUUID(), // This should be replaced with actual user ID in production
                      chat_id: message.chat.id,
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
                  
                  console.log(`Successfully processed media item: ${mediaData.id}`);
                  results.push({ mediaData, publicUrl });
                  totalProcessed++;
                } else {
                  console.log(`Media item already exists: ${existingMedia.id}`);
                }
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

          offset += messages.length;
          if (messages.length < limit) {
            hasMore = false;
          }

          // Add a small delay to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        await logOperation(
          supabase, 
          'sync-telegram-channel', 
          'success', 
          `Successfully synced channel ${channelId}: processed ${totalProcessed} items with ${totalErrors} errors`
        );

      } catch (error) {
        console.error(`Error processing channel ${channelId}:`, error);
        totalErrors++;
        errors.push({
          channelId,
          error: error.message
        });

        await logOperation(
          supabase, 
          'sync-telegram-channel', 
          'error', 
          `Error processing channel ${channelId}: ${error.message}`
        );
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