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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function uploadToGoogleDrive(fileUrl: string, fileName: string) {
  try {
    // Parse credentials properly
    const credentialsStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentialsStr) {
      throw new Error('Google credentials not found');
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsStr);
    } catch (parseError) {
      console.error('Error parsing Google credentials:', parseError);
      throw new Error('Invalid Google credentials format');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: credentials.private_key,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const { access_token } = await response.json();

    // Upload to Google Drive
    const metadata = {
      name: fileName,
      parents: ['1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet']
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));

    // Fetch the file from Supabase
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file from Supabase: ${fileResponse.statusText}`);
    }

    const fileBlob = await fileResponse.blob();
    form.append('file', fileBlob);

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        body: form,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Google Drive API Error:', errorText);
      throw new Error(`Failed to upload to Google Drive: ${uploadResponse.statusText}`);
    }

    const driveFile = await uploadResponse.json();
    return {
      fileId: driveFile.id,
      webViewLink: `https://drive.google.com/file/d/${driveFile.id}/view`
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
}

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

    // Log the activity with the message type
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
      const mediaBlob = await mediaResponse.blob();

      const fileExt = fileData.result.file_path.split('.').pop();
      const fileName = generateSafeFileName(messageCaption || mediaItem.file_id, fileExt);

      // Upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from("telegram-media")
        .upload(fileName, mediaBlob, {
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

      // Save media with Google Drive information if available
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