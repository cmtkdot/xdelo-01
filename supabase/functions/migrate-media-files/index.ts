import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all media records
    const { data: mediaRecords, error: fetchError } = await supabase
      .from('media')
      .select('*');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${mediaRecords.length} media records to process`);

    for (const record of mediaRecords) {
      try {
        // Determine the new bucket based on media type
        const newBucket = record.media_type?.includes('video')
          ? 'telegram-video'
          : record.media_type?.includes('image') || record.media_type?.includes('photo')
          ? 'telegram-pictures'
          : 'telegram-media';

        // Extract the file name from the current URL
        const fileName = record.file_name;
        const oldBucket = record.file_url.split('/').slice(-2)[0];

        console.log(`Processing ${fileName} - Moving from ${oldBucket} to ${newBucket}`);

        if (oldBucket === newBucket) {
          console.log(`File ${fileName} is already in the correct bucket`);
          continue;
        }

        // Download the file from the old bucket
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from(oldBucket)
          .download(fileName);

        if (downloadError) {
          console.error(`Error downloading ${fileName}:`, downloadError);
          continue;
        }

        // Upload to the new bucket
        const { error: uploadError } = await supabase
          .storage
          .from(newBucket)
          .upload(fileName, fileData, {
            contentType: record.media_type,
            upsert: true
          });

        if (uploadError) {
          console.error(`Error uploading ${fileName} to new bucket:`, uploadError);
          continue;
        }

        // Delete from the old bucket
        const { error: deleteError } = await supabase
          .storage
          .from(oldBucket)
          .remove([fileName]);

        if (deleteError) {
          console.error(`Error deleting ${fileName} from old bucket:`, deleteError);
          continue;
        }

        console.log(`Successfully migrated ${fileName} to ${newBucket}`);
      } catch (error) {
        console.error(`Error processing record ${record.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Media files migration completed' 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    );
  }
});