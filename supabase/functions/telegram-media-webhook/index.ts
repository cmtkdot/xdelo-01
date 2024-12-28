import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateWebhookAuth, validateBotToken } from "./utils/auth.ts";
import { 
  generateSafeFileName, 
  determineMediaType, 
  getMediaItem,
  formatMediaMetadata 
} from "./utils/fileHandling.ts";
import { saveChannel, saveMessage, saveMedia } from "./utils/database.ts";
import { uploadToGoogleDrive } from "./utils/googleDrive.ts";
import { convertToMp4 } from "./utils/videoProcessing.ts";
import { determineMessageType } from "./utils/messageTypes.ts";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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
    const userId = '00000000-0000-0000-0000-000000000000'; // Default system user ID

    await saveChannel(supabase, chat, userId);
    await saveMessage(supabase, chat, message, userId);

    // Log the activity
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
        message_type: messageType
      }
    });

    if (message.photo || message.document || message.video || message.audio || 
        message.voice || message.animation || message.sticker) {
      const mediaType = determineMediaType(message);
      const mediaItem = getMediaItem(message);
      
      const metadata = formatMediaMetadata(mediaItem, message);
      console.log("Formatted metadata:", metadata);
      
      const messageCaption = message.caption || message.text || null;
      
      const fileResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${mediaItem.file_id}`
      );
      const fileData = await fileResponse.json();
      
      if (!fileData.ok) {
        throw new Error("Failed to get file path from Telegram");
      }

      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
      const mediaResponse = await fetch(fileUrl);
      const mediaBuffer = await mediaResponse.arrayBuffer();

      const fileExt = fileData.result.file_path.split('.').pop();
      const fileName = generateSafeFileName(messageCaption || mediaItem.file_id, fileExt);

      // Convert video to MP4 if needed
      let finalBuffer = mediaBuffer;
      if (mediaType === 'video') {
        try {
          finalBuffer = await convertToMp4(new Uint8Array(mediaBuffer));
        } catch (error) {
          console.error('Error converting video:', error);
          // Continue with original buffer if conversion fails
        }
      }

      // Upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from("telegram-media")
        .upload(fileName, finalBuffer, {
          contentType: mediaItem.mime_type || 'application/octet-stream',
          upsert: true,
        });

      if (storageError) {
        throw storageError;
      }

      const { data: publicUrl } = supabase.storage
        .from("telegram-media")
        .getPublicUrl(fileName);

      // Upload to Google Drive
      let driveData;
      try {
        driveData = await uploadToGoogleDrive(publicUrl.publicUrl, fileName);
        console.log('Successfully uploaded to Google Drive:', driveData);
      } catch (error) {
        console.error('Failed to upload to Google Drive:', error);
      }

      // Save media with Google Drive information
      const mediaData = await saveMedia(
        supabase,
        userId,
        chat.id,
        fileName,
        publicUrl.publicUrl,
        mediaType,
        messageCaption,
        metadata,
        message.media_group_id,
        driveData?.fileId,
        driveData?.webViewLink
      );

      console.log(`Successfully processed media with caption: "${messageCaption}" and media_group_id: ${message.media_group_id}`);

      await supabase.from("bot_activities").insert({
        event_type: "media_saved",
        chat_id: chat.id,
        user_id: userId,
        details: {
          media_type: mediaType,
          file_name: fileName,
          media_group_id: message.media_group_id,
          caption: messageCaption,
          google_drive_id: driveData?.fileId
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
