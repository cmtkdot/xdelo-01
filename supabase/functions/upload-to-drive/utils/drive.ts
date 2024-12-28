const TELEGRAM_MEDIA_FOLDER = '1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet';

export const uploadToDrive = async (fileUrl: string, fileName: string, accessToken: string) => {
  console.log(`Starting upload to Drive for file: ${fileName}`);
  
  try {
    // Fetch the file content
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file from URL: ${fileResponse.statusText}`);
    }

    const blob = await fileResponse.blob();
    
    // Prepare metadata for Google Drive
    const metadata = {
      name: fileName,
      mimeType: blob.type || 'application/octet-stream',
      parents: [TELEGRAM_MEDIA_FOLDER]
    };

    // Create form data for multipart upload
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    // Upload to Google Drive
    console.log('Uploading to Google Drive...');
    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      console.error('Google Drive API Error:', errorData);
      throw new Error(`Failed to upload to Google Drive: ${errorData}`);
    }

    const result = await uploadResponse.json();
    console.log('Successfully uploaded to Google Drive. File ID:', result.id);
    
    return {
      fileId: result.id,
      webViewLink: `https://drive.google.com/file/d/${result.id}/view`
    };
  } catch (error) {
    console.error('Error in uploadToDrive:', error);
    throw error;
  }
};