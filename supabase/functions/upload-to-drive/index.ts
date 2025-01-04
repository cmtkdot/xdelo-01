import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGoogleApiKey } from "../_shared/google-auth.ts";
import { generateServiceAccountToken } from "./auth.ts";
import { uploadToDrive } from "./driveUtils.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting upload-to-drive function...');
    
    // Get Google API key first
    const apiKey = await getGoogleApiKey();
    console.log('Successfully retrieved Google API key');
    
    // Get Google credentials from environment
    const credentialsStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentialsStr) {
      throw new Error('Google service account credentials not configured');
    }

    const credentials = JSON.parse(credentialsStr);
    console.log('Generating service account token...');
    const accessToken = await generateServiceAccountToken(credentials);

    const requestBody = await req.json();
    console.log('Processing request for:', requestBody.fileName || 'multiple files');

    let results;
    if (requestBody.files && Array.isArray(requestBody.files)) {
      console.log(`Processing ${requestBody.files.length} files for upload`);
      results = await Promise.all(
        requestBody.files.map(async (file) => {
          if (!file.fileUrl || !file.fileName) {
            throw new Error('Missing file information in files array');
          }
          console.log('Processing file:', file.fileName);
          
          // Check if video conversion is needed
          if (file.fileName.match(/\.(mov|avi|wmv|flv|webm)$/i)) {
            console.log('Converting video to MP4:', file.fileName);
            
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
                    url: file.fileUrl
                  },
                  'convert-1': {
                    operation: 'convert',
                    input: 'import-1',
                    output_format: 'mp4',
                    engine: 'ffmpeg',
                    input_format: file.fileName.split('.').pop()
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

            // Wait for the job to complete
            const convertedFileUrl = jobData.data.tasks.find(task => task.name === 'export-1').result.files[0].url;
            file.fileUrl = convertedFileUrl;
            file.fileName = file.fileName.replace(/\.[^/.]+$/, '.mp4');
          }
          
          return await uploadToDrive(file.fileUrl, file.fileName, accessToken);
        })
      );
    } else if (requestBody.fileUrl && requestBody.fileName) {
      console.log('Processing single file:', requestBody.fileName);
      
      // Check if video conversion is needed
      if (requestBody.fileName.match(/\.(mov|avi|wmv|flv|webm)$/i)) {
        console.log('Converting video to MP4:', requestBody.fileName);
        
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
                url: requestBody.fileUrl
              },
              'convert-1': {
                operation: 'convert',
                input: 'import-1',
                output_format: 'mp4',
                engine: 'ffmpeg',
                input_format: requestBody.fileName.split('.').pop()
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

        // Wait for the job to complete
        const convertedFileUrl = jobData.data.tasks.find(task => task.name === 'export-1').result.files[0].url;
        requestBody.fileUrl = convertedFileUrl;
        requestBody.fileName = requestBody.fileName.replace(/\.[^/.]+$/, '.mp4');
      }
      
      results = await uploadToDrive(requestBody.fileUrl, requestBody.fileName, accessToken);
    } else {
      throw new Error('Invalid request format: missing file information');
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in upload-to-drive function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});