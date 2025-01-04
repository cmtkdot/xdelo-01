export const uploadToDrive = async (fileUrl: string, fileName: string, accessToken: string) => {
  try {
    console.log(`Fetching file from URL: ${fileUrl}`);
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log(`File fetched successfully, size: ${blob.size} bytes`);

    const metadata = {
      name: fileName,
      parents: ['1adMg2GVEDfYk3GBeyi4fRSGVcGJkYH24'] // Telegram Media folder
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

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
    console.log('Upload successful:', result);

    // Generate web view link
    const webViewLink = `https://drive.google.com/file/d/${result.id}/view`;
    
    return {
      fileId: result.id,
      webViewLink
    };
  } catch (error) {
    console.error('Error in uploadToDrive:', error);
    throw error;
  }
};