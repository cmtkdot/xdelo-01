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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Check content type case-insensitively
    const contentType = req.headers.get("content-type")?.toLowerCase();
    if (!contentType?.includes("application/json")) {
      console.error("Invalid content type:", contentType);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Content-Type must be application/json" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const payload = await req.json();
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

    const message = payload.message || payload.channel_post;
    if (!message) {
      console.log('No message content found in payload');
      return new Response(
        JSON.stringify({ success: true, message: "No content to process" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save channel info
    const userId = crypto.randomUUID();
    const channelData = {
      user_id: userId,
      chat_id: message.chat.id,
      title: message.chat.title || `Chat ${message.chat.id}`,
      username: message.chat.username,
      is_active: true
    };

    await logOperation(
      supabase,
      'telegram-media-webhook',
      'info',
      `Processing message from channel: ${channelData.title}`
    );

    const { error: channelError } = await supabase
      .from('channels')
      .upsert(channelData, {
        onConflict: 'chat_id',
        ignoreDuplicates: false,
      });

    if (channelError) {
      console.error('Error saving channel:', channelError);
      throw channelError;
    }

    // Save message
    const messageData = {
      user_id: userId,
      chat_id: message.chat.id,
      message_id: message.message_id,
      sender_name: message.from?.username || message.from?.first_name || 'Unknown',
      text: message.text || message.caption,
      media_type: message.photo ? 'photo' : message.video ? 'video' : message.document ? 'document' : null,
      created_at: new Date(message.date * 1000).toISOString()
    };

    // Check for existing message
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', messageData.chat_id)
      .eq('message_id', messageData.message_id)
      .single();

    if (!existingMessage) {
      const { error: messageError } = await supabase
        .from('messages')
        .insert(messageData);

      if (messageError) {
        console.error('Error saving message:', messageError);
        throw messageError;
      }
    }

    // Process media if present
    if (message.photo?.length > 0 || message.video || message.document) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (!botToken) {
        throw new Error('Telegram bot token not configured');
      }

      const mediaItem = message.photo 
        ? message.photo[message.photo.length - 1] 
        : message.video || message.document;

      // Check for existing media
      const { data: existingMedia } = await supabase
        .from('media')
        .select('id')
        .eq('metadata->file_unique_id', mediaItem.file_unique_id)
        .single();

      if (existingMedia) {
        console.log('Media already exists, skipping upload');
        return new Response(
          JSON.stringify({ success: true, message: "Media already exists" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Download and process new media
      const { buffer, filePath } = await getAndDownloadTelegramFile(mediaItem.file_id, botToken);
      
      // Generate safe filename
      const timestamp = Date.now();
      const fileName = `${mediaItem.file_unique_id}_${timestamp}.${filePath.split('.').pop() || 'unknown'}`;
      
      // Determine media type
      const mediaType = message.photo 
        ? 'image/jpeg' 
        : (message.video ? 'video/mp4' : 'application/octet-stream');

      // Upload to Supabase storage
      const publicUrl = await uploadToStorage(supabase, fileName, buffer, mediaType);

      // Create media record with metadata
      const metadata = {
        file_id: mediaItem.file_id,
        file_unique_id: mediaItem.file_unique_id,
        message_id: message.message_id,
        media_group_id: message.media_group_id,
        content_type: mediaType,
        file_size: mediaItem.file_size,
        file_path: filePath
      };

      await createMediaRecord(
        supabase,
        userId,
        message.chat.id,
        fileName,
        publicUrl,
        mediaType,
        message.caption,
        metadata,
        message.media_group_id
      );

      await logOperation(
        supabase,
        'telegram-media-webhook',
        'success',
        `Successfully processed media from message ${message.message_id}`
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in webhook handler:', error);
    
    await logOperation(
      supabase,
      'telegram-media-webhook',
      'error',
      `Error: ${error.message}`
    );

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});