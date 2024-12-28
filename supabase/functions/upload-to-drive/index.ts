import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { isVideoFile, convertToMp4 } from './videoUtils.ts'
import { uploadToDrive } from './driveUtils.ts'
import { generateServiceAccountToken } from './authUtils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Ensure the request has a body and it's valid JSON
    const requestText = await req.text();
    if (!requestText) {
      throw new Error('Request body is empty');
    }

    let requestData;
    try {
      requestData = JSON.parse(requestText);
    } catch (e) {
      console.error('JSON Parse Error:', e);
      throw new Error(`Invalid JSON in request body: ${e.message}`);
    }

    const { files, fileUrl, fileName } = requestData;
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get service account credentials
    const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
    
    // Generate JWT token for service account
    const jwtToken = await generateServiceAccountToken(credentials);

    const uploadSingleFile = async (fileUrl: string, fileName: string) => {
      console.log('Uploading file:', fileName);
      
      // Download file from Supabase URL
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from Supabase: ${fileName}`);
      }
      
      let blob = await response.blob();
      let finalFileName = fileName;
      
      // Convert video files to MP4 if needed
      if (isVideoFile(blob.type)) {
        console.log('Converting video to MP4 format');
        const arrayBuffer = await blob.arrayBuffer();
        blob = await convertToMp4(arrayBuffer, fileName);
        finalFileName = fileName.replace(/\.[^/.]+$/, '.mp4');
      }

      // Upload to Google Drive
      const result = await uploadToDrive(blob, finalFileName, jwtToken);
      console.log('Successfully uploaded to Google Drive:', result);

      // Get the Google Drive file link
      const driveFileUrl = `https://drive.google.com/file/d/${result.id}/view`;

      // Update the media record with Google Drive information
      const { error: updateError } = await supabase
        .from('media')
        .update({
          google_drive_id: result.id,
          google_drive_url: driveFileUrl
        })
        .eq('file_url', fileUrl);

      if (updateError) {
        console.error('Error updating media record:', updateError);
        throw updateError;
      }

      return { fileId: result.id, fileUrl: driveFileUrl };
    };

    let results;
    if (files && Array.isArray(files)) {
      // Handle multiple files
      results = await Promise.all(
        files.map(file => uploadSingleFile(file.fileUrl, file.fileName))
      );
    } else if (fileUrl && fileName) {
      // Handle single file
      results = await uploadSingleFile(fileUrl, fileName);
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
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});