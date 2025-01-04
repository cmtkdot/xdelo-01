import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { parseGoogleCredentials } from './utils/credentials.ts'
import { generateServiceAccountToken } from './utils/auth.ts'
import { uploadToDrive } from './utils/drive.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting upload-to-drive function...');
    
    const MAX_BODY_SIZE = 10 * 1024 * 1024;
    const contentLength = parseInt(req.headers.get('content-length') || '0');
    
    if (contentLength > MAX_BODY_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: 'Request body too large',
          details: 'Maximum allowed size is 10MB' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 413 
        }
      );
    }

    const requestBody = await req.json();
    console.log('Processing request for:', requestBody.fileName || 'multiple files');

    const credentialsStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentialsStr) {
      throw new Error('Google service account credentials not configured');
    }

    console.log('Parsing Google credentials...');
    const credentials = parseGoogleCredentials(credentialsStr);
    console.log('Generating access token...');
    const accessToken = await generateServiceAccountToken(credentials);

    let results;
    if (requestBody.files && Array.isArray(requestBody.files)) {
      console.log(`Processing ${requestBody.files.length} files for upload`);
      results = await Promise.all(
        requestBody.files.map(async (file) => {
          if (!file.fileUrl || !file.fileName) {
            throw new Error('Missing file information in files array');
          }
          console.log('Processing file:', file.fileName);
          
          // Trigger video conversion for MOV files
          if (file.fileName.toLowerCase().endsWith('.mov')) {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/video-converter`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileUrl: file.fileUrl,
                fileName: file.fileName,
                mediaId: file.mediaId
              })
            });
          }
          
          return await uploadToDrive(file.fileUrl, file.fileName, accessToken);
        })
      );
    } else if (requestBody.fileUrl && requestBody.fileName) {
      console.log('Processing single file:', requestBody.fileName);
      
      // Trigger video conversion for single MOV file
      if (requestBody.fileName.toLowerCase().endsWith('.mov')) {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/video-converter`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileUrl: requestBody.fileUrl,
            fileName: requestBody.fileName,
            mediaId: requestBody.mediaId
          })
        });
      }
      
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