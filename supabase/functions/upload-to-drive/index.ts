import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { files, fileUrl, fileName } = await req.json()
    
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
      const blob = await response.blob();

      // Prepare metadata for Google Drive
      const metadata = {
        name: fileName,
        mimeType: blob.type,
        parents: ['1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet'] // Telegram Media folder
      };

      // Create form data for the Google Drive API
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      // Upload to Google Drive using service account
      const uploadResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
          body: form,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.text();
        console.error('Google Drive API Error:', errorData);
        throw new Error(`Failed to upload to Google Drive: ${fileName}`);
      }

      const result = await uploadResponse.json();
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

// Helper function to generate a JWT token for service account authentication
async function generateServiceAccountToken(credentials: any) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // Token expires in 1 hour

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: credentials.private_key_id
  };

  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: exp,
    iat: now
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header));
  const claimB64 = btoa(JSON.stringify(claim));
  const message = `${headerB64}.${claimB64}`;

  // Convert PEM to CryptoKey
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    str2ab(credentials.private_key),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(message)
  );

  const jwt = `${message}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
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