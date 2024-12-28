const TELEGRAM_MEDIA_FOLDER = '1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet';

export const uploadToDrive = async (fileUrl: string, fileName: string, accessToken: string) => {
  console.log(`Starting upload to Drive for file: ${fileName}`);
  
  if (!fileUrl || !fileName) {
    throw new Error('File URL and filename are required');
  }
  
  try {
    // Fetch the file content
    console.log('Fetching file from URL:', fileUrl);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file from URL: ${fileResponse.statusText}`);
    }

    const blob = await fileResponse.blob();
    console.log('File fetched successfully, size:', blob.size);
    
    // Prepare metadata for Google Drive
    const metadata = {
      name: fileName,
      mimeType: blob.type || 'application/octet-stream',
      parents: [TELEGRAM_MEDIA_FOLDER]
    };

    console.log('Uploading with metadata:', metadata);

    // Create form data for multipart upload
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    // Upload to Google Drive
    console.log('Sending request to Google Drive API...');
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

    const responseText = await uploadResponse.text();
    console.log('Google Drive API response:', responseText);

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload to Google Drive: ${responseText}`);
    }

    const result = JSON.parse(responseText);
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