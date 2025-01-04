import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileName, mediaId } = await req.json();
    console.log('Starting video conversion for:', fileName);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update media status to "processing"
    await supabase
      .from('media')
      .update({ 
        metadata: { 
          conversion_status: 'processing',
          original_file_name: fileName,
          conversion_started_at: new Date().toISOString()
        }
      })
      .eq('id', mediaId);

    // Get the Cloud Convert API key
    const cloudConvertApiKey = Deno.env.get('CLOUD_CONVERTAPIKEY');
    if (!cloudConvertApiKey) {
      throw new Error('Cloud Convert API key not configured');
    }

    try {
      // Create job
      const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cloudConvertApiKey}`
        },
        body: JSON.stringify({
          tasks: {
            'import-1': {
              operation: 'import/url',
              url: fileUrl
            },
            'convert-1': {
              operation: 'convert',
              input: 'import-1',
              output_format: 'mp4',
              engine: 'ffmpeg',
              input_format: 'mov'
            },
            'export-1': {
              operation: 'export/url',
              input: 'convert-1',
              inline: false,
              archive_multiple_files: false
            }
          }
        })
      });

      if (!createJobResponse.ok) {
        throw new Error(`Failed to create conversion job: ${await createJobResponse.text()}`);
      }

      const jobData = await createJobResponse.json();
      console.log('Conversion job created:', jobData);

      // Update media record with conversion job ID
      await supabase
        .from('media')
        .update({ 
          metadata: { 
            conversion_status: 'processing',
            conversion_job_id: jobData.data.id,
            original_file_name: fileName
          }
        })
        .eq('id', mediaId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Video conversion job started',
          jobId: jobData.data.id,
          mediaId
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (conversionError) {
      console.error('Error in video conversion:', conversionError);
      
      // Update media record with error status
      await supabase
        .from('media')
        .update({ 
          metadata: { 
            conversion_status: 'error',
            error_message: conversionError.message,
            error_timestamp: new Date().toISOString()
          }
        })
        .eq('id', mediaId);

      throw conversionError;
    }
  } catch (error) {
    console.error('Error in video conversion:', error);
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