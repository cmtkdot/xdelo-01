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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all media files from the database
    const { data: mediaFiles, error: mediaError } = await supabase
      .from('media')
      .select('*');

    if (mediaError) {
      console.error('Error fetching media:', mediaError);
      throw mediaError;
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No media files found to update',
          updates: [] 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const updates = [];

    for (const file of mediaFiles) {
      const fileName = file.file_name;
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      let contentType;
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        case 'mp4':
          contentType = 'video/mp4';
          break;
        case 'webm':
          contentType = 'video/webm';
          break;
        case 'mov':
          contentType = 'video/quicktime';
          break;
        default:
          contentType = 'application/octet-stream';
      }

      try {
        console.log(`Updating content type for ${fileName} to ${contentType}`);
        
        const { error: updateError } = await supabase
          .storage
          .from('telegram-media')
          .update(fileName, await (await fetch(file.file_url)).arrayBuffer(), {
            contentType,
            upsert: true
          });

        if (updateError) {
          console.error(`Error updating ${fileName}:`, updateError);
          updates.push({
            fileName,
            error: updateError.message,
            success: false
          });
          continue;
        }

        updates.push({
          fileName,
          contentType,
          success: true
        });

      } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
        updates.push({
          fileName,
          error: error.message,
          success: false
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Content types update completed',
        updates 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in update-media-content-types:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});