import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { logOperation } from "../_shared/database.ts";
import { uploadToStorage, generateSafeFileName } from "../_shared/storage.ts";
import { getAndDownloadTelegramFile } from "../_shared/telegram.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mediaIds } = await req.json();

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

        const fileId = media.metadata?.file_id;
        if (!fileId) {
          throw new Error('No file_id found in metadata');
        }

        const { buffer, filePath } = await getAndDownloadTelegramFile(fileId, botToken);
        
        const timestamp = Date.now();
        const newFileName = generateSafeFileName(
          `${media.file_name.split('.')[0]}_${timestamp}`,
          filePath.split('.').pop() || 'unknown'
        );

        const publicUrl = await uploadToStorage(
          supabase,
          newFileName,
          buffer,
          media.metadata?.mime_type || 'application/octet-stream'
        );

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
    await logOperation(supabase, 'resync-media', 'error', `Global error: ${error.message}`);

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