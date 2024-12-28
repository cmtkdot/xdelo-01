import { generateJWT } from './auth.ts';

interface GoogleCredentials {
  client_email: string;
  private_key: string;
  [key: string]: string;
}

export async function uploadToGoogleDrive(fileUrl: string, fileName: string) {
  try {
    console.log('Starting Google Drive upload for:', fileName);
    
    const credentialsStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentialsStr) {
      console.error('Google credentials not found in environment');
      throw new Error('Google credentials not found');
    }

    let credentials: GoogleCredentials;
    try {
      // Try to parse credentials, if it fails, assume it's a base64 encoded string
      try {
        console.log('Attempting direct JSON parse of credentials...');
        credentials = JSON.parse(credentialsStr);
      } catch (parseError) {
        console.log('Direct parse failed, attempting base64 decode...');
        const decodedStr = atob(credentialsStr);
        credentials = JSON.parse(decodedStr);
      }
      console.log('Successfully parsed Google credentials for:', credentials.client_email);
    } catch (parseError) {
      console.error('Error parsing Google credentials:', parseError);
      throw new Error('Invalid Google credentials format');
    }

    console.log('Generating JWT token...');
    const jwt = await generateJWT(credentials);
    
    console.log('Requesting access token...');
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get access token:', errorText);
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const { access_token } = await response.json();
    console.log('Successfully obtained access token');

    // Upload to Google Drive
    const metadata = {
      name: fileName,
      parents: ['1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet']
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));

    console.log('Fetching file from:', fileUrl);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file from Supabase: ${fileResponse.statusText}`);
    }

    const fileBlob = await fileResponse.blob();
    form.append('file', fileBlob);

    console.log('Uploading file to Google Drive...');
    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        body: form,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Google Drive API Error:', errorText);
      throw new Error(`Failed to upload to Google Drive: ${uploadResponse.statusText}`);
    }

    const driveFile = await uploadResponse.json();
    console.log('Successfully uploaded to Google Drive. File ID:', driveFile.id);
    
    return {
      fileId: driveFile.id,
      webViewLink: `https://drive.google.com/file/d/${driveFile.id}/view`
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
}