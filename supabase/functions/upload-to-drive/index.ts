import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { parseGoogleCredentials } from './utils/credentials.ts'
import { generateServiceAccountToken } from './utils/auth.ts'
import { uploadToDrive } from './utils/drive.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting upload-to-drive function...');
    
    // Parse request body
    const requestBody = await req.json().catch(error => {
      console.error('Error parsing request body:', error);
      throw new Error(`Invalid JSON in request body: ${error.message}`);
    });

    if (!requestBody) {
      throw new Error('Request body is empty');
    }

    // Get and parse Google credentials
    const credentialsStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentialsStr) {
      throw new Error('Google credentials not found in environment');
    }

    // Parse credentials and get access token
    const credentials = parseGoogleCredentials(credentialsStr);
    const accessToken = await generateServiceAccountToken(credentials);

    // Handle single or multiple file uploads
    let results;
    if (requestBody.files && Array.isArray(requestBody.files)) {
      // Handle multiple files
      console.log('Processing multiple files:', requestBody.files.length);
      results = await Promise.all(
        requestBody.files.map(async (file) => {
          console.log('Processing file:', file.fileName);
          return await uploadToDrive(file.fileUrl, file.fileName, accessToken);
        })
      );
    } else if (requestBody.fileUrl && requestBody.fileName) {
      // Handle single file
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
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});