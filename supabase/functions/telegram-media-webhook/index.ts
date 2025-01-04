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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log start of webhook processing
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'telegram-media-webhook',
        status: 'info',
        message: 'Starting webhook processing'
      });

    const payload = await req.json();
    const message = payload.message || payload.channel_post;

    if (!message) {
      return new Response(
        JSON.stringify({ success: true, message: "No media content to process" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    // Handle media message
    if (message.photo || message.video || message.document) {
      const mediaItem = message.photo 
        ? message.photo[message.photo.length - 1] 
        : message.video || message.document;

      // Get file info from Telegram
      const fileResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${mediaItem.file_id}`
      );
      
      if (!fileResponse.ok) {
        throw new Error('Failed to get file info from Telegram');
      }

      const fileData = await fileResponse.json();
      const filePath = fileData.result.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

      // Generate safe file name
      const timestamp = Date.now();
      const fileExt = filePath.split('.').pop()?.toLowerCase() || 'unknown';
      const safeFileName = `${mediaItem.file_unique_id}_${timestamp}.${fileExt}`;

      // Determine media type
      let mediaType = message.document?.mime_type || 'application/octet-stream';
      if (message.photo) {
        mediaType = 'image/jpeg';
      } else if (message.video) {
        mediaType = 'video/mp4';
      }

      // Download and upload file
      const fileContent = await (await fetch(downloadUrl)).arrayBuffer();
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('telegram-media')
        .upload(safeFileName, fileContent, {
          contentType: mediaType,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Generate public URL
      const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${safeFileName}`;

      // Create media record
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .insert({
          user_id: crypto.randomUUID(), // This should be replaced with actual user ID in production
          chat_id: message.chat.id,
          file_name: safeFileName,
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
        })
        .select()
        .single();

      if (mediaError) {
        throw mediaError;
      }

      // Log success
      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'telegram-media-webhook',
          status: 'success',
          message: `Successfully processed media from message ${message.message_id}`
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: mediaData,
          message: "Media processed successfully" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "No media content to process" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log error
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'telegram-media-webhook',
        status: 'error',
        message: `Error: ${error.message}`
      });

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