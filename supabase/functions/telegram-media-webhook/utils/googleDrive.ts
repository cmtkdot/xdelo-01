import { generateJWT } from './auth.ts';

export async function uploadToGoogleDrive(fileUrl: string, fileName: string) {
  try {
    const credentialsStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentialsStr) {
      throw new Error('Google credentials not found');
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsStr);
    } catch (parseError) {
      console.error('Error parsing Google credentials:', parseError);
      throw new Error('Invalid Google credentials format');
    }

    const jwt = await generateJWT(credentials);
    
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
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const { access_token } = await response.json();

    // Upload to Google Drive
    const metadata = {
      name: fileName,
      parents: ['1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet']
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));

    // Fetch the file from Supabase
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file from Supabase: ${fileResponse.statusText}`);
    }

    const fileBlob = await fileResponse.blob();
    form.append('file', fileBlob);

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
    return {
      fileId: driveFile.id,
      webViewLink: `https://drive.google.com/file/d/${driveFile.id}/view`
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
}