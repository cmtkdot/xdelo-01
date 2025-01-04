import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getGoogleApiKey } from "../_shared/google-auth.ts";
import { generateServiceAccountToken } from "./auth.ts";
import { uploadToDrive } from "./driveUtils.ts";
import { FFmpeg } from "https://esm.sh/@ffmpeg/ffmpeg@0.12.7";

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
            const videoResponse = await fetch(file.fileUrl);
            const videoBuffer = await videoResponse.arrayBuffer();
            
            const ffmpeg = new FFmpeg();
            await ffmpeg.load();
            
            const inputUint8Array = new Uint8Array(videoBuffer);
            await ffmpeg.writeFile('input', inputUint8Array);
            
            await ffmpeg.exec(['-i', 'input', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', 'output.mp4']);
            
            const data = await ffmpeg.readFile('output.mp4');
            const convertedBlob = new Blob([data], { type: 'video/mp4' });
            
            // Update file information for upload
            file.fileName = file.fileName.replace(/\.[^/.]+$/, '.mp4');
            file.fileUrl = URL.createObjectURL(convertedBlob);
          }
          
          return await uploadToDrive(file.fileUrl, file.fileName, accessToken);
        })
      );
    } else if (requestBody.fileUrl && requestBody.fileName) {
      console.log('Processing single file:', requestBody.fileName);
      
      // Check if video conversion is needed
      if (requestBody.fileName.match(/\.(mov|avi|wmv|flv|webm)$/i)) {
        console.log('Converting video to MP4:', requestBody.fileName);
        const videoResponse = await fetch(requestBody.fileUrl);
        const videoBuffer = await videoResponse.arrayBuffer();
        
        const ffmpeg = new FFmpeg();
        await ffmpeg.load();
        
        const inputUint8Array = new Uint8Array(videoBuffer);
        await ffmpeg.writeFile('input', inputUint8Array);
        
        await ffmpeg.exec(['-i', 'input', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', 'output.mp4']);
        
        const data = await ffmpeg.readFile('output.mp4');
        const convertedBlob = new Blob([data], { type: 'video/mp4' });
        
        // Update file information for upload
        requestBody.fileName = requestBody.fileName.replace(/\.[^/.]+$/, '.mp4');
        requestBody.fileUrl = URL.createObjectURL(convertedBlob);
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