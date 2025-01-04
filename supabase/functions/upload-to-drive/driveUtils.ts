export const uploadToDrive = async (fileUrl: string, fileName: string, accessToken: string) => {
  try {
    console.log(`Fetching file from URL: ${fileUrl}`);
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    let blob = await response.blob();
    const originalType = blob.type;
    
    // Handle video conversion if needed
    if (originalType.startsWith('video/') && !originalType.includes('mp4')) {
      console.log('Converting video to MP4 format...');
      
      // Create form data for conversion
      const formData = new FormData();
      formData.append('file', blob, fileName);
      
      // Get Cloud Convert API key
      const cloudConvertApiKey = Deno.env.get('CLOUD_CONVERTAPIKEY');
      if (!cloudConvertApiKey) {
        throw new Error('Cloud Convert API key not configured');
      }

      // Create conversion job
      const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cloudConvertApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tasks: {
            'import-1': {
              operation: 'import/url',
              url: fileUrl
            },
            'convert-1': {
              operation: 'convert',
              input: 'import-1',
              output_format: 'mp4',
              engine: 'ffmpeg',
              input_format: originalType.split('/')[1]
            },
            'export-1': {
              operation: 'export/url',
              input: 'convert-1',
              inline: false,
              archive_multiple_files: false
            }
          }
        })
      });

      if (!createJobResponse.ok) {
        throw new Error(`Failed to create conversion job: ${await createJobResponse.text()}`);
      }

      const jobData = await createJobResponse.json();
      console.log('Video conversion job created:', jobData);

      // Wait for conversion to complete and get the converted file
      const convertedFileResponse = await fetch(jobData.data.result.files[0].url);
      if (!convertedFileResponse.ok) {
        throw new Error('Failed to fetch converted video');
      }
      
      blob = await convertedFileResponse.blob();
      console.log('Video conversion completed');
    }

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
      webViewLink,
      convertedToMp4: originalType.startsWith('video/') && !originalType.includes('mp4')
    };
  } catch (error) {
    console.error('Error in uploadToDrive:', error);
    throw error;
  }
};