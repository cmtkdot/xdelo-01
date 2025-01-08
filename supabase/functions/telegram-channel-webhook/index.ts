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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('Processing webhook request...');
    
    if (req.headers.get("content-type") !== "application/json") {
      throw new Error("Content-Type must be application/json");
    }

    const payload = await req.json();
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

    // Extract message data
    const message = payload.message || payload.channel_post;
    if (!message) {
      return new Response(
        JSON.stringify({ success: true, message: "No content to process" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process channel information
    const channelData = {
      user_id: crypto.randomUUID(), // This should be replaced with actual user ID in production
      chat_id: message.chat.id,
      title: message.chat.title || `Chat ${message.chat.id}`,
      username: message.chat.username,
      is_active: true
    };

    // Update channel information
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

    // Process media if present
    if (message.photo?.length > 0 || message.video || message.document) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (!botToken) {
        throw new Error('Telegram bot token not configured');
      }

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
      if (!fileData.ok || !fileData.result.file_path) {
        throw new Error('Invalid file data received from Telegram');
      }

      // Download file from Telegram
      const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
      const fileDownloadResponse = await fetch(downloadUrl);
      
      if (!fileDownloadResponse.ok) {
        throw new Error('Failed to download file from Telegram');
      }

      const fileBuffer = await fileDownloadResponse.arrayBuffer();
      const timestamp = Date.now();
      const fileName = `${mediaItem.file_unique_id}_${timestamp}.${fileData.result.file_path.split('.').pop()}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('telegram-media')
        .upload(fileName, fileBuffer, {
          contentType: message.photo ? 'image/jpeg' : message.video ? 'video/mp4' : 'application/octet-stream',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
      }

      // Generate public URL
      const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${fileName}`;

      // Create media record
      const mediaData = {
        user_id: channelData.user_id,
        chat_id: message.chat.id,
        file_name: fileName,
        file_url: publicUrl,
        media_type: message.photo ? 'image/jpeg' : message.video ? 'video/mp4' : 'application/octet-stream',
        caption: message.caption,
        metadata: {
          file_id: mediaItem.file_id,
          file_unique_id: mediaItem.file_unique_id,
          message_id: message.message_id,
          media_group_id: message.media_group_id,
          file_size: mediaItem.file_size
        },
        media_group_id: message.media_group_id,
        public_url: publicUrl
      };

      const { error: mediaError } = await supabase
        .from('media')
        .insert(mediaData);

      if (mediaError) {
        console.error('Error saving media:', mediaError);
        throw mediaError;
      }
    }

    // Log successful operation
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'telegram-channel-webhook',
        status: 'success',
        message: `Successfully processed message ${message.message_id} from chat ${message.chat.id}`
      });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in webhook handler:', error);
    
    // Log error
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'telegram-channel-webhook',
        status: 'error',
        message: `Error: ${error.message}`
      });

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});