import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from './cors.ts';

export const uploadToDrive = async (fileUrl: string, fileName: string) => {
  console.log('Uploading file:', fileName);
  
  // Download file from Supabase URL
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from Supabase: ${fileName}`);
  }
  const blob = await response.blob();

  // Get service account credentials
  const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
  
  // Generate JWT token for service account
  const jwtToken = await generateServiceAccountToken(credentials);

  // Prepare metadata for Google Drive
  const metadata = {
    name: fileName,
    mimeType: blob.type,
    parents: ['1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet'] // Telegram Media folder
  };

  // Create form data
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  // Upload to Google Drive
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

  return {
    fileId: result.id,
    fileUrl: `https://drive.google.com/file/d/${result.id}/view`
  };
};

// Helper function to generate JWT token
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
