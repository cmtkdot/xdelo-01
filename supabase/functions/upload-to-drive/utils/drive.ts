import { ROOT_FOLDER_NAME } from '../config.ts';

export const uploadToDrive = async (fileUrl: string, fileName: string, accessToken: string) => {
  console.log(`Starting upload to Google Drive for file: ${fileName}`);
  
  try {
    const folderId = await findOrCreateRootFolder(accessToken);
    
    console.log('Fetching file from URL:', fileUrl);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${fileUrl}. Status: ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log('File fetched. Type:', blob.type, 'Size:', blob.size);

    // Use chunked upload for large files
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    if (blob.size > CHUNK_SIZE) {
      return await uploadLargeFile(blob, fileName, folderId, accessToken);
    } else {
      return await uploadSmallFile(blob, fileName, folderId, accessToken);
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

async function findOrCreateRootFolder(accessToken: string): Promise<string> {
  console.log('Looking for root folder:', ROOT_FOLDER_NAME);
  
  // First, try to find existing folder
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchResponse.ok) {
    const errorData = await searchResponse.text();
    throw new Error(`Failed to search for root folder: ${errorData}`);
  }

  const searchResult = await searchResponse.json();
  
  if (searchResult.files && searchResult.files.length > 0) {
    console.log('Found existing root folder:', searchResult.files[0].id);
    return searchResult.files[0].id;
  }

  // Create new folder if it doesn't exist
  console.log('Creating new root folder');
  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: ROOT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        permissionIds: ['anyone'],
        writersCanShare: true
      }),
    }
  );

  if (!createResponse.ok) {
    const errorData = await createResponse.text();
    throw new Error(`Failed to create root folder: ${errorData}`);
  }

  const folder = await createResponse.json();
  console.log('Created new root folder:', folder.id);

  // Set folder permissions
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${folder.id}/permissions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'anyone',
        allowFileDiscovery: true
      }),
    }
  );

  return folder.id;
}