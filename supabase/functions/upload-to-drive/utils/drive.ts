import { ROOT_FOLDER_NAME } from '../config.ts';

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

  // If folder doesn't exist, create it
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
  return folder.id;
}

export const uploadToDrive = async (fileUrl: string, fileName: string, accessToken: string) => {
  console.log(`Starting upload to Google Drive for file: ${fileName}`);
  
  try {
    // First get or create the root folder
    const folderId = await findOrCreateRootFolder(accessToken);
    
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
      parents: [folderId]
    };

    console.log('Preparing upload to Google Drive with metadata:', metadata);

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    console.log('Sending request to Google Drive API...');
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
      console.error('Google Drive API Error Response:', errorData);
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