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
    await logOperation(
      supabase,
      'webhook-forwarder',
      'success',
      'Scheduled caption sync completed'
    );
  } catch (error) {
    console.error('Error in scheduled caption sync:', error);
    await logOperation(
      supabase,
      'webhook-forwarder',
      'error',
      `Caption sync failed: ${error.message}`
    );
  }
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

    const { message } = await req.json();

    if (!message) {
      throw new Error('No message found in webhook payload');
    }

    // Handle media messages
    if (message.photo || message.video || message.document) {
      const mediaItem = message.photo 
        ? message.photo[message.photo.length - 1] 
        : message.video || message.document;

      if (mediaItem?.file_id) {
        console.log('Checking for duplicate media with file_unique_id:', mediaItem.file_unique_id);
        
        // Check for existing media with same file_unique_id
        const { data: existingMedia, error: queryError } = await supabaseClient
          .from('media')
          .select('*')
          .filter('metadata->file_unique_id', 'eq', mediaItem.file_unique_id)
          .maybeSingle();

        if (queryError) {
          console.error('Error checking for duplicates:', queryError);
          throw queryError;
        }

        if (existingMedia) {
          console.log('Duplicate media found:', existingMedia.id);
          
          // Update existing media record with new information
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
          
          await logOperation(
            supabaseClient,
            'webhook-forwarder',
            'info',
            `Updated existing media with file_unique_id: ${mediaItem.file_unique_id}`
          );
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Media record updated',
              mediaId: existingMedia.id 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If no duplicate found, proceed with file download and upload
        const response = await fetch(
          `https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/getFile?file_id=${mediaItem.file_id}`,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        const fileData = await response.json();
        
        if (!fileData.ok) {
          throw new Error(`Failed to get file data: ${JSON.stringify(fileData)}`);
        }
        
        const fileUrl = `https://api.telegram.org/file/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/${fileData.result.file_path}`;
        const mediaResponse = await fetch(fileUrl);
        const buffer = await mediaResponse.arrayBuffer();

        const fileName = `${mediaItem.file_unique_id}_${Date.now()}.${fileData.result.file_path.split('.').pop()}`;
        const mediaType = message.photo ? 'image' : (message.video ? 'video' : 'document');

        // Upload to storage
        const publicUrl = await uploadToStorage(supabaseClient, fileName, buffer, mediaType);

        // Create media record with file_unique_id in metadata
        const metadata = {
          file_id: mediaItem.file_id,
          file_unique_id: mediaItem.file_unique_id,
          file_size: mediaItem.file_size,
          mime_type: mediaItem.mime_type,
          width: mediaItem.width,
          height: mediaItem.height,
          duration: mediaItem.duration,
          message_id: message.message_id,
          file_path: fileData.result.file_path,
          content_type: mediaItem.mime_type || `${mediaType}/${fileData.result.file_path.split('.').pop()}`,
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