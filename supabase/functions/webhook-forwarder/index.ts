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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    if (req.headers.get("content-type") !== "application/json") {
      throw new Error("Content-type must be application/json");
    }

    const payload = await req.json();
    console.log('Received webhook payload:', JSON.stringify(payload));

    // Handle Telegram updates
    if (payload.message || payload.channel_post) {
      const message = payload.message || payload.channel_post;
      const userId = crypto.randomUUID();

      // Check for media content
      const mediaItem = message.photo 
        ? message.photo[message.photo.length - 1] 
        : message.video || message.document;

      if (mediaItem?.file_id) {
        // Check for duplicates
        const { data: existingMedia } = await supabase
          .from('media')
          .select('id, file_name, metadata')
          .eq('metadata->file_unique_id', mediaItem.file_unique_id)
          .single();

        if (existingMedia) {
          console.log('Duplicate media found:', existingMedia.id);
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Duplicate media skipped",
              existingMedia 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Download and process media
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        if (!botToken) throw new Error('Telegram bot token not configured');

        const { buffer, filePath } = await getAndDownloadTelegramFile(mediaItem.file_id, botToken);
        
        // Generate safe filename and determine media type
        const timestamp = Date.now();
        const fileName = `${mediaItem.file_unique_id}_${timestamp}.${filePath.split('.').pop() || 'unknown'}`;
        const mediaType = message.photo 
          ? 'image/jpeg' 
          : (message.video ? 'video/mp4' : 'application/octet-stream');

        // Upload to storage
        const publicUrl = await uploadToStorage(supabase, fileName, buffer, mediaType);

        // Create media record
        const metadata = {
          file_id: mediaItem.file_id,
          file_unique_id: mediaItem.file_unique_id,
          message_id: message.message_id,
          media_group_id: message.media_group_id,
          content_type: mediaType,
          file_size: mediaItem.file_size,
          file_path: filePath,
          original_message: message
        };

        const mediaRecord = await createMediaRecord(
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
          'webhook-forwarder',
          'success',
          `Successfully processed media from message ${message.message_id}`
        );

        return new Response(
          JSON.stringify({ success: true, mediaRecord }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle general webhook requests
    const { webhook_url, method = 'POST', headers = {}, params = {}, data } = payload;

    if (!webhook_url) {
      throw new Error('Webhook URL is required');
    }

    const queryString = new URLSearchParams(params).toString();
    const finalUrl = queryString ? `${webhook_url}?${queryString}` : webhook_url;

    const response = await fetch(finalUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
    });

    const responseData = await response.json();

    await logOperation(
      supabase,
      'webhook-forwarder',
      'success',
      `Successfully forwarded webhook to ${webhook_url}`
    );

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in webhook handler:', error);
    
    await logOperation(
      supabase,
      'webhook-forwarder',
      'error',
      `Error: ${error.message}`
    );

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});