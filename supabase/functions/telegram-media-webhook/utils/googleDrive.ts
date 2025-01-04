import { generateJWT } from './auth.ts';
import { parseGoogleCredentials } from '../../upload-to-drive/utils/credentials.ts';

export const uploadToGoogleDrive = async (fileUrl: string, fileName: string) => {
  try {
    console.log('Starting Google Drive upload for:', fileName);
    
    const credentialsStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentialsStr) {
      console.error('Google credentials not found in environment');
      return null;
    }

    const credentials = parseGoogleCredentials(credentialsStr);
    if (!credentials?.client_email || !credentials?.private_key) {
      console.error('Invalid credentials structure');
      return null;
    }

    const jwt = await generateJWT(credentials);
    
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

    if (!tokenResponse.ok) {
      console.error('Failed to get access token:', await tokenResponse.text());
      return null;
    }

    const { access_token } = await tokenResponse.json();

    // Fetch the file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      console.error('Failed to fetch file:', fileResponse.statusText);
      return null;
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    
    // Prepare metadata for Google Drive with new folder ID
    const metadata = {
      name: fileName,
      parents: ['1adMg2GVEDfYk3GBeyi4fRSGVcGJkYH24'] // Updated Telegram Media folder
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileBuffer]));

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
      console.error('Google Drive API Error:', await uploadResponse.text());
      return null;
    }

    const driveFile = await uploadResponse.json();
    console.log('Successfully uploaded to Google Drive. File ID:', driveFile.id);
    
    return {
      fileId: driveFile.id,
      webViewLink: `https://drive.google.com/file/d/${driveFile.id}/view`
    };
  } catch (error) {
    console.error('Error in uploadToGoogleDrive:', error);
    return null;
  }
};