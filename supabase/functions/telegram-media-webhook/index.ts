import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateWebhookAuth, validateBotToken } from "./utils/auth.ts";
import { saveChannel, saveMessage, saveBotUser } from "./utils/database.ts";
import { determineMessageType } from "./utils/messageTypes.ts";
import { handleMediaUpload } from "./handlers/mediaHandler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!validateBotToken(botToken)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing bot token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload = await req.json();
    console.log("Received webhook payload:", JSON.stringify(payload, null, 2));

    const messageType = determineMessageType(payload);
    const message = payload.message || payload.channel_post || payload.edited_channel_post || payload.edited_message;
    
    if (!message) {
      return new Response(
        JSON.stringify({ success: true, message: "No message content to process" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const chat = message.chat;
    const userId = crypto.randomUUID();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Handle caption updates for edited messages
    if (payload.edited_message || payload.edited_channel_post) {
      console.log("Processing edited message with potential caption update");
      
      // Try to find the existing media entry using message_id from metadata
      const { data: existingMedia, error: findError } = await supabase
        .from('media')
        .select('*')
        .eq('chat_id', chat.id)
        .contains('metadata', { message_id: message.message_id });

      if (findError) {
        console.error('Error finding existing media:', findError);
      } else if (existingMedia && existingMedia.length > 0) {
        console.log('Found existing media to update caption:', existingMedia[0].id);
        
        // Update the caption
        const { error: updateError } = await supabase
          .from('media')
          .update({ 
            caption: message.caption,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMedia[0].id);

        if (updateError) {
          console.error('Error updating media caption:', updateError);
        } else {
          console.log('Successfully updated media caption');
        }
      }
    }
    
    try {
      await saveBotUser(
        supabase,
        userId,
        message.from?.id?.toString(),
        message.from?.username,
        message.from?.first_name,
        message.from?.last_name
      );
    } catch (error) {
      console.error('Error creating bot user:', error);
      throw error;
    }

    await saveChannel(supabase, chat, userId);
    await saveMessage(supabase, chat, message, userId);

    await supabase.from("bot_activities").insert({
      event_type: "message_received",
      message_type: messageType,
      chat_id: chat.id,
      message_id: message.message_id,
      user_id: userId,
      details: {
        update_id: payload.update_id,
        edit_date: message.edit_date,
        media_group_id: message.media_group_id,
        message_type: messageType,
        is_caption_update: !!payload.edited_message || !!payload.edited_channel_post
      }
    });

    if (message.photo || message.document || message.video || message.audio || 
        message.voice || message.animation || message.sticker) {
      
      const { mediaData, publicUrl } = await handleMediaUpload(
        supabase,
        message,
        userId,
        botToken
      );

      console.log(`Successfully processed media with public URL: ${publicUrl}`);

      await supabase.from("bot_activities").insert({
        event_type: "media_saved",
        chat_id: chat.id,
        user_id: userId,
        details: {
          media_type: mediaData.media_type,
          file_name: mediaData.file_name,
          media_group_id: message.media_group_id,
          caption: mediaData.caption,
          google_drive_id: mediaData.google_drive_id
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});