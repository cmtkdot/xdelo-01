import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    let requestData;
    try {
      const text = await req.text();
      requestData = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body',
          details: e.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { mediaIds } = requestData;

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid or missing mediaIds array',
          details: 'Please provide an array of media IDs to resync' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log('Processing mediaIds:', mediaIds);

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const results = [];
    const errors = [];

    for (const id of mediaIds) {
      try {
        // Log the start of processing for this media ID
        await supabase
          .from('edge_function_logs')
          .insert({
            function_name: 'resync-media',
            status: 'info',
            message: `Starting resync for media ID: ${id}`
          });

        const { data: media, error: mediaError } = await supabase
          .from('media')
          .select('*, channels!inner(*)')
          .eq('id', id)
          .single();

        if (mediaError) throw mediaError;
        if (!media) throw new Error(`Media not found: ${id}`);

        // Check if file exists in storage
        const { data: existingFile } = await supabase.storage
          .from('telegram-media')
          .download(media.file_name);

        if (!existingFile) {
          console.log(`File not found in storage: ${media.file_name}`);
          
          // Get file_id from metadata
          const fileId = media.metadata?.file_id;
          if (!fileId) {
            throw new Error('No file_id found in metadata');
          }

          // Get file path from Telegram
          const fileInfoResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
          );
          const fileInfo = await fileInfoResponse.json();

          if (!fileInfo.ok) {
            throw new Error(`Failed to get file info from Telegram: ${JSON.stringify(fileInfo)}`);
          }

          // Download file from Telegram
          const filePath = fileInfo.result.file_path;
          const fileResponse = await fetch(
            `https://api.telegram.org/file/bot${botToken}/${filePath}`
          );

          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file from Telegram: ${fileResponse.status}`);
          }

          // Upload to storage
          const fileBuffer = await fileResponse.arrayBuffer();
          const timestamp = Date.now();
          const newFileName = `${media.file_name.split('.')[0]}_${timestamp}.${media.file_name.split('.').pop()}`;

          const { error: uploadError } = await supabase.storage
            .from('telegram-media')
            .upload(newFileName, fileBuffer, {
              contentType: media.metadata?.mime_type || 'application/octet-stream',
              upsert: false
            });

          if (uploadError) throw uploadError;

          // Update media record with new file name and public URL
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

          await supabase
            .from('edge_function_logs')
            .insert({
              function_name: 'resync-media',
              status: 'success',
              message: `Successfully resynced media ID: ${id} with new file: ${newFileName}`
            });

          results.push({ id, status: 'recreated', newFileName });
        } else {
          results.push({ id, status: 'exists' });
        }
      } catch (error) {
        console.error(`Failed to recreate file for ${id}:`, error.message);
        
        await supabase
          .from('edge_function_logs')
          .insert({
            function_name: 'resync-media',
            status: 'error',
            message: `Error resyncing media ${id}: ${error.message}`
          });

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
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );

  } catch (error) {
    console.error('Error in resync-media function:', error);
    
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'resync-media',
        status: 'error',
        message: `Global error: ${error.message}`
      });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});