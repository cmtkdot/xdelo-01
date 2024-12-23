import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const TELEGRAM_MEDIA_FOLDER_ID = "1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet";

export async function createJWT(credentials: any) {
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

export function createFormData(file: any, blob: Blob): FormData {
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

export async function uploadFileToDrive(file: any, accessToken: string) {
  console.log(`Processing file: ${file.file_name}`);
  
  const response = await fetch(file.file_url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from Supabase: ${file.file_name}`);
  }
  const blob = await response.blob();

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
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

  return await uploadResponse.json();
}

export async function deleteFromSupabase(supabase: any, file: any) {
  const fileUrl = new URL(file.file_url);
  const pathParts = fileUrl.pathname.split('/');
  const bucket = pathParts[1];
  const filePath = pathParts.slice(2).join('/');

  const { error: deleteError } = await supabase
    .storage
    .from(bucket)
    .remove([filePath]);

  if (deleteError) {
    console.error(`Failed to delete file from Supabase storage: ${file.file_name}`, deleteError);
    return false;
  }
  
  console.log(`Successfully deleted file from Supabase storage: ${file.file_name}`);
  return true;
}