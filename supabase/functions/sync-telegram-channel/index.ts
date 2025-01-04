import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getContentType, getBucketId, generateSafeFileName } from "../telegram-media-webhook/utils/fileHandling.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Process each channel
    for (const channelId of chatIds) {
      try {
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

        // Process messages with media
        for (const update of data.result) {
          const message = update.message || update.channel_post;
          if (message && (message.photo || message.video || message.document)) {
            try {
              const result = await processMediaMessage(message, supabase);
              if (result) results.push(result);
            } catch (error) {
              errors.push({
                messageId: message.message_id,
                error: error.message
              });
            }
          }
        }
      } catch (error) {
        errors.push({
          channelId,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        errors: errors.length,
        details: { results, errors }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
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
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    );
  }
});

async function processMediaMessage(message: any, supabase: any) {
  const mediaItem = message.photo 
    ? message.photo[message.photo.length - 1] 
    : message.video || message.document;

  if (!mediaItem) return null;

  const downloadUrl = await getFile(mediaItem.file_id);
  const fileContent = await (await fetch(downloadUrl)).arrayBuffer();
  
  const timestamp = Date.now();
  const fileExt = downloadUrl.split('.').pop()?.toLowerCase() || 'unknown';
  const safeFileName = generateSafeFileName(
    `${mediaItem.file_unique_id}_${timestamp}`,
    fileExt
  );

  let mediaType = message.document?.mime_type || 'application/octet-stream';
  if (message.photo) {
    mediaType = 'image/jpeg';
  } else if (message.video) {
    mediaType = 'video/mp4';
  }

  const bucketId = getBucketId();
  const contentType = getContentType(safeFileName, mediaType);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketId)
    .upload(safeFileName, fileContent, {
      contentType,
      upsert: false,
      cacheControl: '3600'
    });

  if (uploadError) throw uploadError;

  const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucketId}/${safeFileName}`;

  const metadata = {
    file_id: mediaItem.file_id,
    file_unique_id: mediaItem.file_unique_id,
    file_size: mediaItem.file_size,
    message_id: message.message_id,
    content_type: contentType,
    mime_type: mediaType
  };

  const { data: savedMedia, error: dbError } = await supabase
    .from('media')
    .insert({
      user_id: user.id,
      chat_id: message.chat.id,
      file_name: safeFileName,
      file_url: publicUrl,
      media_type: mediaType,
      caption: message.caption,
      metadata,
      public_url: publicUrl
    })
    .select()
    .single();

  if (dbError) throw dbError;

  return savedMedia;
}

async function getFile(fileId: string) {
  const fileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
  const fileResponse = await fetch(fileUrl);
  const fileData = await fileResponse.json();
  
  if (!fileData.ok) {
    throw new Error(`Failed to get file path: ${JSON.stringify(fileData)}`);
  }
  
  return `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
}
