import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractProductInfo(caption: string) {
  if (!caption) return null;

  // Match pattern: Product Name x Number #ID
  const regex = /^(.*?)\s*x\s*(\d+)\s*#([A-Z0-9]+)/;
  const matches = caption.match(regex);

  if (matches) {
    return {
      product_name: matches[1].trim(),
      units_available: parseInt(matches[2]),
      po_product_id: matches[3]
    };
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!telegramBotToken) {
      throw new Error('Missing TELEGRAM_BOT_TOKEN');
    }

    const update = await req.json();
    const message = update.message;
    
    if (!message) {
      console.error('No message in update:', update);
      return new Response(
        JSON.stringify({ error: 'No message in update' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Extract media info
    const photo = message.photo?.[message.photo?.length - 1];
    const video = message.video;
    const document = message.document;
    const mediaItem = photo || video || document;

    if (!mediaItem) {
      console.error('No media in message:', message);
      return new Response(
        JSON.stringify({ error: 'No media in message' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Processing media item:', {
      file_id: mediaItem.file_id,
      file_unique_id: mediaItem.file_unique_id,
      message_id: message.message_id
    });

    // Check for existing media with same file_unique_id
    const { data: existingMedia, error: queryError } = await supabaseClient
      .from('media')
      .select('*')
      .eq('metadata->file_unique_id', mediaItem.file_unique_id)
      .maybeSingle();

    if (queryError) {
      console.error('Error checking for existing media:', queryError);
      throw queryError;
    }

    // Extract product information from caption
    const productInfo = extractProductInfo(message.caption || '');
    console.log('Extracted product info:', productInfo);

    const mediaMetadata = {
      file_id: mediaItem.file_id,
      file_unique_id: mediaItem.file_unique_id,
      file_size: mediaItem.file_size,
      message_id: message.message_id,
      content_type: mediaItem.mime_type || 'image/jpeg',
      media_group_id: message.media_group_id,
      original_message: message,
    };

    if (existingMedia) {
      console.log('Updating existing media:', existingMedia.id);
      
      // Update existing media record
      const { error: updateError } = await supabaseClient
        .from('media')
        .update({
          chat_id: message.chat.id,
          caption: message.caption,
          metadata: mediaMetadata,
          media_group_id: message.media_group_id,
          updated_at: new Date().toISOString(),
          ...(productInfo && {
            product_name: productInfo.product_name,
            units_available: productInfo.units_available,
            po_product_id: productInfo.po_product_id,
          })
        })
        .eq('id', existingMedia.id);

      if (updateError) {
        console.error('Error updating media:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          message: 'Media record updated', 
          id: existingMedia.id,
          productInfo 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get file path from Telegram
    const getFilePath = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/getFile?file_id=${mediaItem.file_id}`
    );
    
    if (!getFilePath.ok) {
      throw new Error(`Failed to get file path: ${getFilePath.statusText}`);
    }

    const fileData = await getFilePath.json();
    if (!fileData.ok || !fileData.result.file_path) {
      throw new Error('Failed to get file path from Telegram');
    }

    // Download file from Telegram
    const fileUrl = `https://api.telegram.org/file/bot${telegramBotToken}/${fileData.result.file_path}`;
    const fileResponse = await fetch(fileUrl);
    
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileName = `${mediaItem.file_unique_id}_${Date.now()}.${fileData.result.file_path.split('.').pop()}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('telegram-media')
      .upload(fileName, fileBuffer, {
        contentType: mediaItem.mime_type || 'image/jpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError);
      throw uploadError;
    }

    // Generate public URL
    const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${fileName}`;

    // Insert new media record
    const { data: newMedia, error: insertError } = await supabaseClient
      .from('media')
      .insert({
        chat_id: message.chat.id,
        file_name: fileName,
        file_url: fileUrl,
        public_url: publicUrl,
        media_type: mediaItem.mime_type || 'image/jpeg',
        caption: message.caption,
        metadata: mediaMetadata,
        media_group_id: message.media_group_id,
        ...(productInfo && {
          product_name: productInfo.product_name,
          units_available: productInfo.units_available,
          po_product_id: productInfo.po_product_id,
        })
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting media:', insertError);
      throw insertError;
    }

    console.log('Successfully processed media:', {
      id: newMedia.id,
      file_name: fileName,
      productInfo
    });

    return new Response(
      JSON.stringify({ 
        message: 'New media record created', 
        id: newMedia.id,
        productInfo 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});