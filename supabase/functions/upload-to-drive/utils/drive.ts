import { TELEGRAM_MEDIA_FOLDER_ID } from '../config.ts';

export const uploadToDrive = async (fileUrl: string, fileName: string, accessToken: string) => {
  console.log(`Starting upload to Google Drive for file: ${fileName}`);
  
  try {
    console.log('Fetching file from URL:', fileUrl);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch file:', errorText);
      throw new Error(`Failed to fetch file from URL: ${fileUrl}. Status: ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log('File fetched successfully. Size:', blob.size, 'Type:', blob.type);
    
    const metadata = {
      name: fileName,
      parents: [TELEGRAM_MEDIA_FOLDER_ID]
    };

    console.log('Preparing upload to Google Drive with metadata:', metadata);

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    console.log('Sending request to Google Drive API...');
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
      console.error('Google Drive API Error Response:', errorData);
      throw new Error(`Google Drive API Error: ${errorData}`);
    }

    const result = await uploadResponse.json();
    console.log('File successfully uploaded to Google Drive:', result);
    return result;
  } catch (error) {
    console.error('Error in uploadToDrive:', error);
    // Include more context in the error message
    throw new Error(`Failed to upload to Google Drive: ${fileName}. Error: ${error.message}`);
  }
};