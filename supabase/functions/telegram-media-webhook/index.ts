import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateWebhookAuth, validateBotToken } from "./utils/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const processMediaMessage = async (supabase: any, message: any, userId: string, botToken: string) => {
  if (!message.photo && !message.document && !message.video && !message.audio && 
      !message.voice && !message.animation && !message.sticker) {
    return null;
  }

  const mediaItem = message.photo 
    ? message.photo[message.photo.length - 1] 
    : message.document || message.video || message.audio || 
      message.voice || message.animation || message.sticker;

  if (!mediaItem) return null;

  const fileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${mediaItem.file_id}`;
  const fileResponse = await fetch(fileUrl);
  const fileData = await fileResponse.json();

  if (!fileData.ok) {
    throw new Error(`Failed to get file path: ${JSON.stringify(fileData)}`);
  }

  const filePath = fileData.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const fileExt = filePath.split('.').pop()?.toLowerCase();
  const timestamp = Date.now();
  const safeFileName = `${mediaItem.file_unique_id}_${timestamp}.${fileExt || 'unknown'}`;
  const bucketId = fileExt === 'mov' ? 'telegram-video' : 'telegram-media';

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketId)
    .upload(safeFileName, await (await fetch(downloadUrl)).arrayBuffer(), {
      contentType: message.document?.mime_type || 'application/octet-stream',
      upsert: false
    });

  if (uploadError) throw uploadError;

  const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucketId}/${safeFileName}`;

  const { data: mediaData, error: mediaError } = await supabase
    .from('media')
    .insert({
      user_id: userId,
      chat_id: message.chat.id,
      file_name: safeFileName,
      file_url: publicUrl,
      media_type: message.document ? message.document.mime_type : 'photo',
      caption: message.caption,
      metadata: {
        file_id: mediaItem.file_id,
        file_unique_id: mediaItem.file_unique_id,
        file_size: mediaItem.file_size,
        message_id: message.message_id,
        media_group_id: message.media_group_id
      },
      media_group_id: message.media_group_id,
      public_url: publicUrl
    })
    .select()
    .single();

  if (mediaError) throw mediaError;
  return mediaData;
};

const updateCaption = async (supabase: any, message: any) => {
  const { data: existingMedia, error: findError } = await supabase
    .from('media')
    .select('*')
    .eq('chat_id', message.chat.id)
    .contains('metadata', { message_id: message.message_id });

  if (findError) {
    console.error('Error finding existing media:', findError);
    return;
  }

  if (existingMedia?.[0]) {
    const { error: updateError } = await supabase
      .from('media')
      .update({ 
        caption: message.caption,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingMedia[0].id);

    if (updateError) {
      console.error('Error updating media caption:', updateError);
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("x-telegram-bot-api-secret-token");
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

    if (!validateWebhookAuth(authHeader, webhookSecret)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid webhook secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateBotToken(botToken)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing bot token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json();
    const message = payload.message || payload.channel_post || 
                   payload.edited_channel_post || payload.edited_message;
    
    if (!message) {
      return new Response(
        JSON.stringify({ success: true, message: "No message content to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const userId = crypto.randomUUID();

    // Handle caption updates for edited messages
    if (payload.edited_message || payload.edited_channel_post) {
      await updateCaption(supabase, message);
      return new Response(
        JSON.stringify({ success: true, message: "Caption updated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Process new media messages
    const mediaData = await processMediaMessage(supabase, message, userId, botToken);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook processed successfully",
        data: mediaData 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});