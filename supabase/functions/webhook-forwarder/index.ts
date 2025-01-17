import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { uploadToStorage, generateSafeFileName } from "../_shared/storage.ts";
import { getAndDownloadTelegramFile } from "../_shared/telegram.ts";

interface TelegramUpdate {
  message?: {
    photo?: any[];
    video?: any;
    document?: any;
    caption?: string;
    media_group_id?: string;
    chat: {
      id: number;
      title?: string;
    };
    message_id: number;
  };
}

function extractProductInfo(caption: string) {
  const result = {
    product_name: null as string | null,
    units_available: null as number | null,
    po_product_id: null as string | null,
  };

  if (!caption) return result;

  // Match pattern: Product Name x Number #ID
  // Examples: "Cherry Runtz x 8 #FISH011425" or "ADL x 5 #CARL010925"
  const regex = /^(.*?)\s*x\s*(\d+)\s*#([A-Z0-9]+)/;
  const matches = caption.match(regex);

  if (matches) {
    result.product_name = matches[1].trim();
    result.units_available = parseInt(matches[2]);
    result.po_product_id = matches[3];
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const update: TelegramUpdate = await req.json();
    const message = update.message;
    if (!message) {
      return new Response(JSON.stringify({ error: 'No message in update' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Extract media info
    const photo = message.photo?.[message.photo?.length - 1];
    const video = message.video;
    const document = message.document;
    const mediaItem = photo || video || document;

    if (!mediaItem) {
      return new Response(JSON.stringify({ error: 'No media in message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check for existing media with same file_unique_id
    const { data: existingMedia } = await supabaseClient
      .from('media')
      .select('*')
      .eq('metadata->file_unique_id', mediaItem.file_unique_id)
      .maybeSingle();

    // Extract product information from caption
    const productInfo = extractProductInfo(message.caption || '');

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
      // Update existing media record
      const { error: updateError } = await supabaseClient
        .from('media')
        .update({
          chat_id: message.chat.id,
          caption: message.caption,
          metadata: mediaMetadata,
          media_group_id: message.media_group_id,
          updated_at: new Date().toISOString(),
          product_name: productInfo.product_name,
          units_available: productInfo.units_available,
          po_product_id: productInfo.po_product_id,
        })
        .eq('id', existingMedia.id);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ message: 'Media record updated', id: existingMedia.id }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Download and process new media
    const { buffer, filePath } = await getAndDownloadTelegramFile(
      mediaItem.file_id,
      telegramBotToken
    );

    const fileExtension = filePath.split('.').pop() || 'jpg';
    const fileName = generateSafeFileName(
      `${mediaItem.file_unique_id}_${Date.now()}`,
      fileExtension
    );

    const contentType = mediaItem.mime_type || 'image/jpeg';
    const fileUrl = await uploadToStorage(supabaseClient, fileName, buffer, contentType);

    // Insert new media record
    const { data: newMedia, error: insertError } = await supabaseClient
      .from('media')
      .insert({
        chat_id: message.chat.id,
        file_name: fileName,
        file_url: fileUrl,
        media_type: contentType,
        caption: message.caption,
        metadata: mediaMetadata,
        media_group_id: message.media_group_id,
        product_name: productInfo.product_name,
        units_available: productInfo.units_available,
        po_product_id: productInfo.po_product_id,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ message: 'New media record created', id: newMedia.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});