import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { uploadToDrive } from './driveUtils.ts'
import { generateServiceAccountToken } from './authUtils.ts'
import { isVideoFile, convertToMp4 } from './videoUtils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body
    const requestBody = await req.json().catch(error => {
      console.error('Error parsing request body:', error);
      throw new Error(`Invalid JSON in request body: ${error.message}`);
    });

    console.log('Parsed request body:', requestBody);

    if (!requestBody) {
      throw new Error('Request body is empty');
    }

    // Get service account credentials
    const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
    
    // Generate JWT token for service account
    const jwtToken = await generateServiceAccountToken(credentials);

    let results;
    if (requestBody.files && Array.isArray(requestBody.files)) {
      // Handle multiple files
      results = await Promise.all(
        requestBody.files.map(async (file) => {
          console.log('Processing file:', file);
          return await uploadToDrive(file.fileUrl, file.fileName, jwtToken);
        })
      );
    } else if (requestBody.fileUrl && requestBody.fileName) {
      // Handle single file
      console.log('Processing single file:', requestBody);
      results = await uploadToDrive(requestBody.fileUrl, requestBody.fileName, jwtToken);
    } else {
      throw new Error('Invalid request format: missing file information');
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in upload-to-drive function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});