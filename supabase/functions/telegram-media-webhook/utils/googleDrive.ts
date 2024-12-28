import { generateJWT } from './auth.ts';

export const uploadToGoogleDrive = async (fileUrl: string, fileName: string) => {
  try {
    console.log('Starting Google Drive upload for:', fileName);
    
    const credentialsStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentialsStr) {
      console.error('Google credentials not found in environment');
      throw new Error('Google credentials not found');
    }

    let credentials;
    try {
      // Try parsing as JSON first
      console.log('Attempting to parse Google credentials...');
      try {
        credentials = JSON.parse(credentialsStr);
      } catch {
        // If that fails, try base64 decode
        console.log('Direct parse failed, attempting base64 decode...');
        const decodedStr = atob(credentialsStr);
        credentials = JSON.parse(decodedStr);
      }
      console.log('Successfully parsed Google credentials');
    } catch (parseError) {
      console.error('Error parsing Google credentials:', parseError);
      throw new Error('Invalid Google credentials format');
    }

    console.log('Generating JWT token...');
    const jwt = await generateJWT(credentials);
    
    console.log('Requesting access token...');
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
      const errorText = await tokenResponse.text();
      console.error('Failed to get access token:', errorText);
      throw new Error(`Failed to get access token: ${tokenResponse.statusText}`);
    }

    const { access_token } = await tokenResponse.json();
    console.log('Successfully obtained access token');

    // Fetch the file from the provided URL
    console.log('Fetching file from:', fileUrl);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileType = fileResponse.headers.get('content-type');
    
    // Check if video conversion is needed
    let finalBuffer = new Uint8Array(fileBuffer);
    let finalFileName = fileName;
    
    if (fileType?.startsWith('video/') || fileName.toLowerCase().endsWith('.mov')) {
      console.log('Video file detected, attempting conversion...');
      try {
        finalBuffer = await convertToMp4(fileBuffer);
        // Update filename to .mp4 if it was converted
        if (fileName.toLowerCase().endsWith('.mov')) {
          finalFileName = fileName.replace(/\.mov$/i, '.mp4');
        }
        console.log('Video conversion completed');
      } catch (convError) {
        console.error('Video conversion failed:', convError);
        console.log('Using original video file as fallback');
      }
    }

    // Prepare metadata for Google Drive
    const metadata = {
      name: finalFileName,
      parents: ['1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet'] // Telegram Media folder
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([finalBuffer]));

    console.log('Uploading to Google Drive...');
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
      const errorData = await uploadResponse.text();
      console.error('Google Drive API Error:', errorData);
      throw new Error(`Failed to upload to Google Drive: ${finalFileName}`);
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
};