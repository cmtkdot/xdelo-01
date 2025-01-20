import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAndDownloadTelegramFile } from "../_shared/telegram.ts";
import { uploadToStorage } from "../_shared/storage.ts";
import { createMediaRecord, logOperation } from "../_shared/database.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log("[telegram-media-webhook] Starting webhook processing");
    
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!telegramBotToken) {
      throw new Error('Missing TELEGRAM_BOT_TOKEN');
    }

    const update = await req.json();
    console.log("[telegram-media-webhook] Received update:", JSON.stringify(update));
    
    // Handle both channel posts and regular messages
    const message = update.message || update.channel_post;
    if (!message) {
      throw new Error('No message in update');
    }

    // Log message details
    console.log("[telegram-media-webhook] Processing message:", {
      message_id: message.message_id,
      chat_id: message.chat.id,
      chat_type: message.chat.type,
      has_photo: !!message.photo,
      has_video: !!message.video,
      has_document: !!message.document,
      has_animation: !!message.animation,
      media_group_id: message.media_group_id
    });

    // Handle channel first
    const { data: existingChannel, error: channelError } = await supabaseClient
      .from('channels')
      .select('id')
      .eq('chat_id', message.chat.id)
      .maybeSingle();

    if (channelError) {
      throw new Error(`Channel fetch error: ${channelError.message}`);
    }

    if (!existingChannel) {
      const { error: insertError } = await supabaseClient
        .from('channels')
        .insert({
          chat_id: message.chat.id,
          title: message.chat.title || `Channel ${message.chat.id}`,
          username: message.chat.username,
          user_id: message.from?.id ? message.from.id.toString() : 'system',
          is_active: true
        });

      if (insertError) {
        throw new Error(`Channel insert error: ${insertError.message}`);
      }
    }

    // Process media if present
    let mediaResult = null;
    if (message.photo || message.video || message.document || message.animation) {
      console.log("[telegram-media-webhook] Processing media message");
      
      let fileId = '';
      let mediaType = '';
      let caption = message.caption || '';
      let fileUniqueId = '';
      let width = null;
      let height = null;
      let fileSize = null;

      // Determine file ID and media type
      if (message.photo) {
        const photo = message.photo[message.photo.length - 1];
        fileId = photo.file_id;
        fileUniqueId = photo.file_unique_id;
        mediaType = 'image';
        width = photo.width;
        height = photo.height;
        fileSize = photo.file_size;
      } else if (message.video) {
        fileId = message.video.file_id;
        fileUniqueId = message.video.file_unique_id;
        mediaType = 'video';
        width = message.video.width;
        height = message.video.height;
        fileSize = message.video.file_size;
      } else if (message.document) {
        fileId = message.document.file_id;
        fileUniqueId = message.document.file_unique_id;
        mediaType = 'document';
        fileSize = message.document.file_size;
      } else if (message.animation) {
        fileId = message.animation.file_id;
        fileUniqueId = message.animation.file_unique_id;
        mediaType = 'animation';
        width = message.animation.width;
        height = message.animation.height;
        fileSize = message.animation.file_size;
      }

      // Check for existing media
      const { data: existingMedia } = await supabaseClient
        .from('media')
        .select('id, file_url')
        .eq('file_unique_id', fileUniqueId)
        .single();

      if (existingMedia) {
        console.log('[telegram-media-webhook] Media already exists:', existingMedia.id);
        mediaResult = {
          mediaId: existingMedia.id,
          fileUrl: existingMedia.file_url,
          mediaType
        };
      } else {
        // Download and process new media
        const { buffer, filePath } = await getAndDownloadTelegramFile(fileId, telegramBotToken);
        
        // Generate unique filename
        const fileName = `${Date.now()}-${fileUniqueId}-${filePath.split('/').pop()}`;
        
        // Upload to Supabase Storage
        const fileUrl = await uploadToStorage(
          supabaseClient,
          fileName,
          buffer,
          mediaType === 'image' ? 'image/jpeg' : 
          mediaType === 'video' ? 'video/mp4' : 
          'application/octet-stream'
        );

        // Create media record
        const mediaData = await createMediaRecord(
          supabaseClient,
          message.from?.id ? message.from.id.toString() : 'system',
          message.chat.id,
          fileName,
          fileUrl,
          mediaType,
          caption,
          {
            message_id: message.message_id,
            file_id: fileId,
            file_unique_id: fileUniqueId,
            media_group_id: message.media_group_id,
            chat_type: message.chat.type,
            forward_info: message.forward_from || message.forward_from_chat
          },
          message.media_group_id,
          fileUrl
        );

        mediaResult = {
          mediaId: mediaData.id,
          fileUrl,
          mediaType
        };
      }
    }

    // Insert message record
    const { error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        chat_id: message.chat.id,
        message_id: message.message_id,
        sender_name: message.from?.first_name || message.chat.title || 'Unknown',
        text: message.caption || message.text,
        user_id: message.from?.id ? message.from.id.toString() : 'system',
        media_type: mediaResult?.mediaType || null,
        media_url: mediaResult?.fileUrl || null,
        public_url: mediaResult?.fileUrl || null,
        created_at: new Date(message.date * 1000).toISOString()
      });

    if (messageError) {
      throw new Error(`Message insert error: ${messageError.message}`);
    }

    // Log success
    await logOperation(
      supabaseClient,
      'telegram-media-webhook',
      'success',
      `Successfully processed message ${message.message_id} from chat ${message.chat.id}`
    );

    return new Response(
      JSON.stringify({ 
        status: 'success',
        message: 'Webhook processed successfully',
        details: {
          message_id: message.message_id,
          chat_id: message.chat.id,
          chat_type: message.chat.type,
          has_media: !!mediaResult,
          media_result: mediaResult
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[telegram-media-webhook] Error:', error);
    
    await logOperation(
      supabaseClient,
      'telegram-media-webhook',
      'error',
      `Error: ${error.message}`
    );

    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});