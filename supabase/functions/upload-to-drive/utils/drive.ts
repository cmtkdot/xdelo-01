import { ROOT_FOLDER_NAME } from '../config.ts';

export const uploadToDrive = async (fileUrl: string, fileName: string, accessToken: string) => {
  console.log(`Starting upload to Google Drive for file: ${fileName}`);
  
  try {
    const folderId = '1adMg2GVEDfYk3GBeyi4fRSGVcGJkYH24'; // Updated folder ID
    
    console.log('Fetching file from URL:', fileUrl);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${fileUrl}. Status: ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log('File fetched. Type:', blob.type, 'Size:', blob.size);

    // Convert MOV to MP4 if necessary
    let finalBlob = blob;
    if (blob.type === 'video/quicktime' || fileName.toLowerCase().endsWith('.mov')) {
      console.log('Converting MOV to MP4...');
      const arrayBuffer = await blob.arrayBuffer();
      const convertedBuffer = await convertToMp4(arrayBuffer);
      finalBlob = new Blob([convertedBuffer], { type: 'video/mp4' });
      fileName = fileName.replace(/\.mov$/i, '.mp4');
    }

    // Use chunked upload for large files
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    if (finalBlob.size > CHUNK_SIZE) {
      return await uploadLargeFile(finalBlob, fileName, folderId, accessToken);
    } else {
      return await uploadSmallFile(finalBlob, fileName, folderId, accessToken);
    }
  } catch (error) {
    console.error('Error in uploadToDrive:', error);
    throw new Error(`Failed to upload to Google Drive: ${fileName}. Error: ${error.message}`);
  }
};

async function uploadSmallFile(blob: Blob, fileName: string, folderId: string, accessToken: string) {
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: blob.type
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

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
}

async function uploadLargeFile(blob: Blob, fileName: string, folderId: string, accessToken: string) {
  console.log(`Using chunked upload for large file: ${fileName}`);
  
  // Start resumable upload session
  const sessionResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fileName,
        parents: [folderId],
        mimeType: blob.type
      })
    }
  );
  
  if (!sessionResponse.ok) {
    throw new Error('Failed to start resumable upload session');
  }
  
  const uploadUrl = sessionResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('No upload URL received');
  }
  
  // Upload in chunks
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const totalSize = blob.size;
  
  for (let start = 0; start < totalSize; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = blob.slice(start, end);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
        'Content-Length': `${end - start}`,
      },
      body: chunk
    });
    
    if (!uploadResponse.ok && uploadResponse.status !== 308) {
      throw new Error(`Chunk upload failed: ${uploadResponse.statusText}`);
    }
    
    console.log(`Uploaded chunk: ${start}-${end} of ${totalSize}`);
    
    if (end === totalSize) {
      const finalResponse = await uploadResponse.json();
      console.log('File successfully uploaded to Google Drive:', finalResponse);
      return finalResponse;
    }
    
    // Add a small delay between chunks to prevent resource exhaustion
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}