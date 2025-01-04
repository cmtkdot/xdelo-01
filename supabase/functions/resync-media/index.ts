import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./utils/corsHeaders.ts";
import { logMessage } from "./utils/logging.ts";
import { 
  fetchMediaDetails, 
  downloadFromTelegram, 
  uploadToStorage, 
  updateMediaRecord 
} from "./utils/mediaHandler.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request data
    let requestData;
    try {
      const text = await req.text();
      requestData = text ? JSON.parse(text) : {};
    } catch (e) {
      await logMessage('error', `Invalid JSON in request body: ${e.message}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { mediaIds } = requestData;

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      await logMessage('error', 'Invalid or missing mediaIds array');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Please provide an array of media IDs to resync'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      await logMessage('error', 'Telegram bot token not configured');
      throw new Error('Telegram bot token not configured');
    }

    const results = [];
    const errors = [];

    for (const id of mediaIds) {
      try {
        await logMessage('info', `Starting resync for media ID: ${id}`);
        
        const media = await fetchMediaDetails(id);
        
        // Check if file exists in storage
        const { data: existingFile } = await supabase.storage
          .from('telegram-media')
          .download(media.file_name);

        if (!existingFile) {
          const fileId = media.metadata?.file_id;
          if (!fileId) {
            throw new Error('No file_id found in metadata');
          }

          const fileBuffer = await downloadFromTelegram(fileId, botToken);
          const newFileName = await uploadToStorage(
            media.file_name, 
            fileBuffer, 
            media.metadata?.mime_type
          );
          
          const publicUrl = await updateMediaRecord(id, newFileName);

          await logMessage('success', `Successfully resynced media ID: ${id} with new file: ${newFileName}`);
          results.push({ id, status: 'recreated', newFileName, publicUrl });
        } else {
          await logMessage('info', `File already exists for media ID: ${id}`);
          results.push({ id, status: 'exists' });
        }
      } catch (error) {
        console.error(`Failed to recreate file for ${id}:`, error);
        await logMessage('error', `Error resyncing media ${id}: ${error.message}`);
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
    await logMessage('error', `Global error: ${error.message}`);

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