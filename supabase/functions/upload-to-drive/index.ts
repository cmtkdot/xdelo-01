import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGoogleApiKey } from "../_shared/google-auth.ts";
import { generateServiceAccountToken } from "./auth.ts";
import { uploadToDrive } from "./driveUtils.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting upload-to-drive function...');
    
    // Get Google API key first
    const apiKey = await getGoogleApiKey();
    console.log('Successfully retrieved Google API key');
    
    // Get Google credentials from environment
    const credentialsStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentialsStr) {
      throw new Error('Google service account credentials not configured');
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsStr);
    } catch (e) {
      console.error('Error parsing credentials:', e);
      throw new Error('Invalid Google service account credentials format');
    }

    console.log('Generating service account token...');
    const accessToken = await generateServiceAccountToken(credentials);

    let requestBody;
    try {
      const text = await req.text();
      requestBody = text ? JSON.parse(text) : {};
      console.log('Parsed request body:', requestBody);
    } catch (e) {
      console.error('Error parsing request body:', e);
      throw new Error('Invalid JSON in request body');
    }

    if (!requestBody) {
      throw new Error('Request body is required');
    }

    console.log('Processing request for:', requestBody.fileName || 'multiple files');

    let results;
    if (requestBody.files && Array.isArray(requestBody.files)) {
      console.log(`Processing ${requestBody.files.length} files for upload`);
      results = await Promise.all(
        requestBody.files.map(async (file) => {
          if (!file.fileUrl || !file.fileName) {
            throw new Error('Missing file information in files array');
          }
          console.log('Processing file:', file.fileName);
          return await uploadToDrive(file.fileUrl, file.fileName, accessToken);
        })
      );
    } else if (requestBody.fileUrl && requestBody.fileName) {
      console.log('Processing single file:', requestBody.fileName);
      results = await uploadToDrive(requestBody.fileUrl, requestBody.fileName, accessToken);
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
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        details: 'Failed to process upload request'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});