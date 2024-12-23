import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TELEGRAM_MEDIA_FOLDER_ID = "1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get service account credentials from environment
    const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
    
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Invalid service account credentials');
    }

    console.log('Starting migration with service account:', credentials.client_email);

    // Get all media files that haven't been migrated to Google Drive
    const { data: mediaFiles, error: fetchError } = await supabase
      .from('media')
      .select('*')
      .is('google_drive_id', null)

    if (fetchError) {
      console.error('Failed to fetch media files:', fetchError);
      throw new Error(`Failed to fetch media files: ${fetchError.message}`);
    }

    console.log(`Found ${mediaFiles?.length || 0} files to migrate`);

    const results = [];
    
    // Process each file
    for (const file of mediaFiles || []) {
      try {
        console.log(`Processing file: ${file.file_name}`);
        
        // Download file from Supabase URL
        const response = await fetch(file.file_url);
        if (!response.ok) {
          throw new Error(`Failed to fetch file from Supabase: ${file.file_name}`);
        }
        const blob = await response.blob();

        // Create JWT token for Google Drive API
        const jwtToken = await createJWT(credentials);

        // Upload to Google Drive using service account
        const uploadResponse = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              'Content-Type': 'multipart/form-data',
            },
            body: createFormData(file, blob),
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.text();
          console.error('Google Drive API Error:', errorData);
          throw new Error(`Failed to upload to Google Drive: ${file.file_name}`);
        }

        const result = await uploadResponse.json();
        console.log(`Successfully uploaded to Google Drive: ${file.file_name}, ID: ${result.id}`);

        // Get the Google Drive file link
        const driveFileUrl = `https://drive.google.com/file/d/${result.id}/view`;

        // Update the media record with Google Drive information
        const { error: updateError } = await supabase
          .from('media')
          .update({
            google_drive_id: result.id,
            google_drive_url: driveFileUrl
          })
          .eq('id', file.id);

        if (updateError) {
          console.error('Failed to update media record:', updateError);
          throw new Error(`Failed to update media record: ${updateError.message}`);
        }

        // Extract bucket and path from Supabase URL
        const fileUrl = new URL(file.file_url);
        const pathParts = fileUrl.pathname.split('/');
        const bucket = pathParts[1];
        const filePath = pathParts.slice(2).join('/');

        // Delete file from Supabase Storage
        const { error: deleteError } = await supabase
          .storage
          .from(bucket)
          .remove([filePath]);

        if (deleteError) {
          console.error(`Failed to delete file from Supabase storage: ${file.file_name}`, deleteError);
          // Don't throw error here, we want to continue with other files
        } else {
          console.log(`Successfully deleted file from Supabase storage: ${file.file_name}`);
        }

        results.push({
          success: true,
          fileName: file.file_name,
          driveUrl: driveFileUrl,
          deleted: !deleteError
        });

      } catch (error) {
        console.error(`Error processing file ${file.file_name}:`, error);
        results.push({
          success: false,
          fileName: file.file_name,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Migration completed. ${successCount} files successfully migrated`);

    return new Response(
      JSON.stringify({ 
        message: `Migration completed. ${successCount}/${results.length} files migrated successfully`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to create JWT token for Google Drive API
async function createJWT(credentials: any) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Create signature
  const encoder = new TextEncoder();
  const privateKey = credentials.private_key.replace(/\\n/g, '\n');
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    encoder.encode(privateKey),
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

  const jwt = `${encodedHeader}.${encodedClaim}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

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

// Helper function to create form data for Google Drive API
function createFormData(file: any, blob: Blob): FormData {
  const metadata = {
    name: file.file_name,
    mimeType: blob.type,
    parents: [TELEGRAM_MEDIA_FOLDER_ID],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  return form;
}