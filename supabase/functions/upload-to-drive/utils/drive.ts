import { isVideoFile, isMovFile, convertToMp4 } from './videoProcessing.ts';

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
    
    // Handle MOV to MP4 conversion
    if (isMovFile(fileName)) {
      console.log('Converting MOV to MP4...');
      const arrayBuffer = await finalBlob.arrayBuffer();
      const convertedBuffer = await convertToMp4(arrayBuffer);
      finalBlob = new Blob([convertedBuffer], { type: 'video/mp4' });
      finalFileName = fileName.replace(/\.mov$/i, '.mp4');
      console.log('Conversion complete. New filename:', finalFileName);
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