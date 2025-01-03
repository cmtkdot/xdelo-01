import { TELEGRAM_MEDIA_FOLDER_ID } from '../config.ts';

export const uploadToDrive = async (fileUrl: string, fileName: string, accessToken: string) => {
  console.log(`Uploading file to Google Drive: ${fileName}`);
  
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${fileUrl}`);
    }
    
    const blob = await response.blob();
    
    const metadata = {
      name: fileName,
      parents: [TELEGRAM_MEDIA_FOLDER_ID]
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
        body: form
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      console.error('Google Drive API Error:', errorData);
      throw new Error(`Failed to upload to Google Drive: ${fileName}`);
    }

    return await uploadResponse.json();
  } catch (error) {
    console.error('Error in uploadToDrive:', error);
    throw error;
  }
};