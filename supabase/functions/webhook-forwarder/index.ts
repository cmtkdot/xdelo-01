import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processMediaMessage } from "./utils/mediaProcessor.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Process the media message
    const result = await processMediaMessage(supabaseClient, message, telegramBotToken);
    
    if (result.error) {
      console.error('[webhook-forwarder] Error processing media:', result.error);
      return new Response(
        JSON.stringify({ error: result.error }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // If we found an existing media entry
    if (result.existingMedia) {
      console.log('[webhook-forwarder] Found existing media:', result.existingMedia.id);
      
      // Only update if changes are needed
      if (result.requiresUpdate) {
        console.log('[webhook-forwarder] Updating existing media:', result.existingMedia.id);
        
        const { error: updateError } = await supabaseClient
          .from('media')
          .update({
            chat_id: message.chat.id,
            caption: message.caption,
            metadata: result.mediaMetadata,
            media_group_id: message.media_group_id,
            updated_at: new Date().toISOString(),
            ...(result.productInfo && {
              product_name: result.productInfo.product_name,
              units_available: result.productInfo.units_available,
              po_product_id: result.productInfo.po_product_id,
            })
          })
          .eq('id', result.existingMedia.id);

        if (updateError) {
          console.error('[webhook-forwarder] Error updating media:', updateError);
          throw updateError;
        }
      }

      return new Response(
        JSON.stringify({ 
          message: result.requiresUpdate ? 'Media record updated' : 'No updates needed', 
          id: result.existingMedia.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Insert new media record if no duplicate was found
    console.log('[webhook-forwarder] Creating new media record');
    const { data: newMedia, error: insertError } = await supabaseClient
      .from('media')
      .insert({
        chat_id: message.chat.id,
        file_name: result.fileName,
        file_url: result.publicUrl,
        public_url: result.publicUrl,
        media_type: result.mediaMetadata.content_type,
        caption: message.caption,
        metadata: result.mediaMetadata,
        media_group_id: message.media_group_id,
        file_unique_id: result.mediaMetadata.file_unique_id,
        ...(result.productInfo && {
          product_name: result.productInfo.product_name,
          units_available: result.productInfo.units_available,
          po_product_id: result.productInfo.po_product_id,
        })
      })
      .select()
      .single();

    if (insertError) {
      console.error('[webhook-forwarder] Error inserting media:', insertError);
      throw insertError;
    }

    console.log('[webhook-forwarder] Successfully processed media:', {
      id: newMedia.id,
      file_name: result.fileName,
      file_unique_id: result.mediaMetadata.file_unique_id
    });

    return new Response(
      JSON.stringify({ 
        message: 'New media record created', 
        id: newMedia.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    );

  } catch (error) {
    console.error('[webhook-forwarder] Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});