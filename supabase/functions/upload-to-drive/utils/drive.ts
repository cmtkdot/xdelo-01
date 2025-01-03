import { ROOT_FOLDER_NAME } from '../config.ts';
import { isVideoFile, convertToMp4 } from './videoProcessing.ts';

export const uploadToDrive = async (fileUrl: string, fileName: string, accessToken: string) => {
  console.log(`Starting upload to Google Drive for file: ${fileName}`);
  
  try {
    const folderId = await findOrCreateRootFolder(accessToken);
    
    console.log('Fetching file from URL:', fileUrl);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${fileUrl}. Status: ${response.status}`);
    }
    
    let blob = await response.blob();
    console.log('Original file fetched. Type:', blob.type, 'Size:', blob.size);

    // Convert video files to MP4
    if (isVideoFile(blob.type)) {
      console.log('Video file detected, converting to MP4...');
      const buffer = await blob.arrayBuffer();
      const convertedBuffer = await convertToMp4(buffer);
      blob = new Blob([convertedBuffer], { type: 'video/mp4' });
      console.log('Video conversion completed. New size:', blob.size);
    }

    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: blob.type
    };

    console.log('Uploading to Google Drive with metadata:', metadata);

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
  } catch (error) {
    console.error('Error in uploadToDrive:', error);
    throw new Error(`Failed to upload to Google Drive: ${fileName}. Error: ${error.message}`);
  }
};

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
    console.error('Error searching for folder:', errorData);
    throw new Error(`Failed to search for root folder: ${errorData}`);
  }

  const searchResult = await searchResponse.json();
  
  // If folder exists, return its ID
  if (searchResult.files && searchResult.files.length > 0) {
    console.log('Found existing root folder:', searchResult.files[0].id);
    return searchResult.files[0].id;
  }

  // If folder doesn't exist, create it with specific permissions
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
        // Make the folder accessible to the service account
        permissionIds: ['anyone'],
        writersCanShare: true
      }),
    }
  );

  if (!createResponse.ok) {
    const errorData = await createResponse.text();
    console.error('Error creating folder:', errorData);
    throw new Error(`Failed to create root folder: ${errorData}`);
  }

  const folder = await createResponse.json();
  console.log('Created new root folder:', folder.id);

  // Set permissions for the new folder
  console.log('Setting folder permissions...');
  const permissionResponse = await fetch(
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

  if (!permissionResponse.ok) {
    const errorData = await permissionResponse.text();
    console.error('Error setting folder permissions:', errorData);
    throw new Error(`Failed to set folder permissions: ${errorData}`);
  }

  console.log('Folder permissions set successfully');
  return folder.id;
}
