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
    let requestBody;
    try {
      const text = await req.text();
      console.log('Raw request body:', text);
      requestBody = JSON.parse(text);
      console.log('Parsed request body:', requestBody);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body format',
          details: parseError.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    // Get and validate credentials
    const credentialsStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentialsStr) {
      console.error('Missing Google service account credentials');
      return new Response(
        JSON.stringify({ error: 'Google service account credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Parsing Google credentials...');
    const credentials = parseGoogleCredentials(credentialsStr);
    console.log('Generating access token...');
    const accessToken = await generateServiceAccountToken(credentials);

    // Handle single or multiple file uploads
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
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in upload-to-drive function:', error);
    return new Response(
      JSON.stringify({ 
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