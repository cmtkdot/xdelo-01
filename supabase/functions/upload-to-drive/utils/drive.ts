export const uploadToDrive = async (fileUrl: string, fileName: string, accessToken: string) => {
  console.log(`Starting upload to Google Drive for file: ${fileName}`);
  
  try {
    const folderId = '1adMg2GVEDfYk3GBeyi4fRSGVcGJkYH24';
    
    console.log('Fetching file from URL:', fileUrl);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${fileUrl}. Status: ${response.status}`);
    }
    
    let finalBlob = await response.blob();
    let finalFileName = fileName;

    // Note: Video conversion is temporarily disabled
    // We'll just upload the original file for now
    if (isMovFile(fileName)) {
      console.log('MOV file detected - uploading original format');
      finalFileName = fileName;
    }

    const metadata = {
      name: finalFileName,
      parents: [folderId],
      mimeType: finalBlob.type
    };

    console.log('Uploading to Google Drive with metadata:', metadata);

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', finalBlob);

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: form
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      throw new Error(`Google Drive API Error: ${errorData}`);
    }

    const result = await uploadResponse.json();
    console.log('File successfully uploaded to Google Drive:', result);
    return result;
  } catch (error) {
    console.error('Error in uploadToDrive:', error);
    throw new Error(`Failed to upload to Google Drive: ${fileName}. Error: ${error.message}`);
  }
};