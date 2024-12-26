import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders, handleCors } from './utils/cors.ts';
import { parseRequest } from './utils/requestParser.ts';
import { uploadToDrive } from './utils/driveUploader.ts';

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const requestData = await parseRequest(req);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let results;
    if (requestData.files && Array.isArray(requestData.files)) {
      // Handle multiple files
      results = await Promise.all(
        requestData.files.map(async (file) => {
          const result = await uploadToDrive(file.fileUrl, file.fileName);
          
          // Update media record
          await supabase
            .from('media')
            .update({
              google_drive_id: result.fileId,
              google_drive_url: result.fileUrl
            })
            .eq('file_url', file.fileUrl);

          return result;
        })
      );
    } else if (requestData.fileUrl && requestData.fileName) {
      // Handle single file
      results = await uploadToDrive(requestData.fileUrl, requestData.fileName);
    } else {
      throw new Error('Invalid request: missing file information');
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});