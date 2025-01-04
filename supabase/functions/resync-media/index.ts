import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { logOperation } from "../_shared/database.ts";
import { getAndDownloadTelegramFile } from "../_shared/telegram.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }

    // Parse request body
    const requestText = await req.text();
    console.log('Request body received:', requestText);

    if (!requestText || requestText.trim() === '') {
      throw new Error('Empty request body');
    }

    const { mediaIds } = JSON.parse(requestText);
    console.log('Received request to resync media IDs:', mediaIds);

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      throw new Error('Please provide an array of media IDs to resync');
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const results = [];
    const errors = [];

    for (const id of mediaIds) {
      try {
        await logOperation(supabase, 'resync-media', 'info', `Starting resync for media ID: ${id}`);
        
        const { data: media, error: mediaError } = await supabase
          .from('media')
          .select('*')
          .eq('id', id)
          .single();

        if (mediaError) throw mediaError;
        if (!media) throw new Error(`Media not found: ${id}`);

        const fileId = media.metadata?.file_id;
        if (!fileId) {
          throw new Error('No file_id found in metadata');
        }

        const { buffer, filePath } = await getAndDownloadTelegramFile(fileId, botToken);
        
        const timestamp = Date.now();
        const fileExt = filePath.split('.').pop() || 'unknown';
        const newFileName = `${media.file_name.split('.')[0]}_${timestamp}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('telegram-media')
          .upload(newFileName, buffer, {
            contentType: media.metadata?.mime_type || 'application/octet-stream',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${newFileName}`;

        const { error: updateError } = await supabase
          .from('media')
          .update({
            file_name: newFileName,
            file_url: publicUrl,
            public_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) throw updateError;

        await logOperation(supabase, 'resync-media', 'success', `Successfully resynced media ID: ${id}`);
        results.push({ id, status: 'resynced', newFileName, publicUrl });
      } catch (error) {
        console.error(`Failed to resync media ${id}:`, error);
        await logOperation(supabase, 'resync-media', 'error', `Error resyncing media ${id}: ${error.message}`);
        errors.push({ id, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errors.length > 0 ? 207 : 200
      }
    );

  } catch (error) {
    console.error('Error in resync-media function:', error);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});