import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { logOperation } from "../_shared/database.ts";
import { uploadToStorage } from "../_shared/storage.ts";

const CAPTION_SYNC_DELAY = 60000; // 1 minute in milliseconds

async function scheduleCaptionSync(supabase: any) {
  await new Promise(resolve => setTimeout(resolve, CAPTION_SYNC_DELAY));
  try {
    await supabase.functions.invoke('sync-media-captions');
    await logOperation(supabase, 'webhook-forwarder', 'success', 'Scheduled caption sync completed');
  } catch (error) {
    console.error('Error in scheduled caption sync:', error);
    await logOperation(supabase, 'webhook-forwarder', 'error', `Caption sync failed: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { message } = await req.json();

    if (!message) {
      throw new Error('No message found in webhook payload');
    }

    // Handle media messages
    if (message.photo || message.video || message.document) {
      const mediaItem = message.photo 
        ? message.photo[message.photo.length - 1] 
        : message.video || message.document;

      if (!mediaItem?.file_id || !mediaItem?.file_unique_id) {
        throw new Error('Invalid media item: missing file_id or file_unique_id');
      }

      console.log('Processing media with file_unique_id:', mediaItem.file_unique_id);

      // Check for existing media using file_unique_id
      const { data: existingMedia, error: queryError } = await supabaseClient
        .from('media')
        .select('*')
        .eq('metadata->file_unique_id', mediaItem.file_unique_id)
        .single();

      if (queryError && queryError.code !== 'PGRST116') { // Ignore "no rows returned" error
        console.error('Error checking for duplicates:', queryError);
        throw queryError;
      }

      if (existingMedia) {
        console.log('Updating existing media:', existingMedia.id);
        
        const updateData = {
          chat_id: message.chat?.id,
          caption: message.caption,
          media_group_id: message.media_group_id,
          updated_at: new Date().toISOString(),
          metadata: {
            ...existingMedia.metadata,
            message_id: message.message_id,
            media_group_id: message.media_group_id,
            original_message: message
          }
        };

        const { error: updateError } = await supabaseClient
          .from('media')
          .update(updateData)
          .eq('id', existingMedia.id);

        if (updateError) {
          console.error('Error updating media:', updateError);
          throw updateError;
        }

        console.log('Successfully updated existing media');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Media record updated',
            mediaId: existingMedia.id 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If no duplicate found, proceed with new media creation
      console.log('Creating new media record');
      
      const { data: fileData, error: fileError } = await supabaseClient.functions.invoke(
        'get-file-info',
        {
          body: { fileId: mediaItem.file_id }
        }
      );

      if (fileError || !fileData?.file_path) {
        throw new Error(`Failed to get file info: ${fileError?.message || 'No file path returned'}`);
      }

      const fileUrl = `https://api.telegram.org/file/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/${fileData.file_path}`;
      const mediaResponse = await fetch(fileUrl);
      
      if (!mediaResponse.ok) {
        throw new Error(`Failed to download file: ${mediaResponse.statusText}`);
      }

      const buffer = await mediaResponse.arrayBuffer();
      const fileExt = fileData.file_path.split('.').pop();
      const fileName = `${mediaItem.file_unique_id}_${Date.now()}.${fileExt}`;
      const mediaType = message.photo ? 'image' : (message.video ? 'video' : 'document');

      // Upload to storage
      const publicUrl = await uploadToStorage(supabaseClient, fileName, buffer, mediaType);

      // Create media record
      const metadata = {
        file_id: mediaItem.file_id,
        file_unique_id: mediaItem.file_unique_id,
        file_size: mediaItem.file_size,
        mime_type: mediaItem.mime_type,
        width: mediaItem.width,
        height: mediaItem.height,
        duration: mediaItem.duration,
        message_id: message.message_id,
        file_path: fileData.file_path,
        content_type: mediaItem.mime_type || `${mediaType}/${fileExt}`,
        media_group_id: message.media_group_id,
        original_message: message
      };

      const { data: media, error: insertError } = await supabaseClient
        .from('media')
        .insert({
          user_id: message.from?.id.toString(),
          chat_id: message.chat?.id,
          file_name: fileName,
          file_url: publicUrl,
          media_type: mediaType,
          caption: message.caption,
          metadata,
          media_group_id: message.media_group_id,
          public_url: publicUrl,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Schedule caption sync after successful media processing
      scheduleCaptionSync(supabaseClient);

      return new Response(
        JSON.stringify({ success: true, mediaId: media.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});