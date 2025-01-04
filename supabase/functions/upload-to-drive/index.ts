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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Google credentials
    const credentialsStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentialsStr) {
      throw new Error('Google service account credentials not configured');
    }

    // Parse credentials and generate token
    const credentials = JSON.parse(credentialsStr);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await generateJWT(credentials),
      }),
    });

    const { access_token: accessToken } = await tokenResponse.json();

    let results;
    if (requestBody.files && Array.isArray(requestBody.files)) {
      console.log(`Processing ${requestBody.files.length} files for upload`);
      results = await Promise.all(
        requestBody.files.map(async (file) => {
          if (!file.fileUrl || !file.fileName) {
            throw new Error('Missing file information in files array');
          }
          console.log('Processing file:', file.fileName);
          
          // Check if it's a MOV file that needs conversion
          if (file.fileName.toLowerCase().endsWith('.mov')) {
            await fetch(`${supabaseUrl}/functions/v1/video-converter`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileUrl: file.fileUrl,
                fileName: file.fileName,
                mediaId: file.mediaId
              })
            });
            
            // Return early as the video will be processed asynchronously
            return {
              status: 'processing',
              fileName: file.fileName,
              message: 'Video conversion in progress'
            };
          }
          
          return await uploadToDrive(file.fileUrl, file.fileName, accessToken);
        })
      );
    } else if (requestBody.fileUrl && requestBody.fileName) {
      console.log('Processing single file:', requestBody.fileName);
      
      if (requestBody.fileName.toLowerCase().endsWith('.mov')) {
        await fetch(`${supabaseUrl}/functions/v1/video-converter`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileUrl: requestBody.fileUrl,
            fileName: requestBody.fileName,
            mediaId: requestBody.mediaId
          })
        });
        
        results = {
          status: 'processing',
          fileName: requestBody.fileName,
          message: 'Video conversion in progress'
        };
      } else {
        results = await uploadToDrive(requestBody.fileUrl, requestBody.fileName, accessToken);
      }
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

// Helper function to generate JWT
async function generateJWT(credentials: any) {
  const now = Math.floor(Date.now() / 1000);
  const oneHour = 60 * 60;

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: credentials.private_key_id
  };

  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + oneHour,
    iat: now
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  const privateKey = credentials.private_key.replace(/\\n/g, '\n');
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    str2ab(privateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyData,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// Helper function to convert string to ArrayBuffer
function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// Helper function to upload file to Google Drive
async function uploadToDrive(fileUrl: string, fileName: string, accessToken: string) {
  const response = await fetch(fileUrl);
  const blob = await response.blob();

  const metadata = {
    name: fileName,
    parents: ['1adMg2GVEDfYk3GBeyi4fRSGVcGJkYH24']
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.text();
    console.error('Google Drive API Error:', errorData);
    throw new Error(`Failed to upload to Google Drive: ${fileName}`);
  }

  return await uploadResponse.json();
}