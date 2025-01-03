import { FFmpeg } from 'https://esm.sh/@ffmpeg/ffmpeg@0.12.7';

export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

export const convertToMp4 = async (inputBuffer: ArrayBuffer): Promise<Uint8Array> => {
  try {
    console.log('Starting FFmpeg conversion...');
    const ffmpeg = new FFmpeg();
    await ffmpeg.load();
    
    // Process in smaller chunks to reduce memory usage
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const inputArray = new Uint8Array(inputBuffer);
    let processedChunks = [];
    
    for (let i = 0; i < inputArray.length; i += CHUNK_SIZE) {
      const chunk = inputArray.slice(i, i + CHUNK_SIZE);
      await ffmpeg.writeFile(`chunk_${i}`, chunk);
      console.log(`Processed chunk ${i / CHUNK_SIZE + 1}`);
    }
    
    // Concatenate and convert chunks
    await ffmpeg.exec([
      '-i', 'concat:' + Array.from({ length: Math.ceil(inputArray.length / CHUNK_SIZE) }, (_, i) => `chunk_${i * CHUNK_SIZE}`).join('|'),
      '-c:v', 'libx264',
      '-preset', 'ultrafast', // Use faster preset to reduce processing time
      '-crf', '28', // Slightly reduce quality to improve processing speed
      '-c:a', 'aac',
      '-b:a', '128k',
      'output.mp4'
    ]);
    
    const data = await ffmpeg.readFile('output.mp4');
    console.log('FFmpeg conversion completed successfully');
    
    return new Uint8Array(data);
  } catch (error) {
    console.error('FFmpeg conversion failed, falling back to CloudConvert:', error);
    return await convertWithCloudConvert(inputBuffer);
  }
};

async function convertWithCloudConvert(inputBuffer: ArrayBuffer): Promise<Uint8Array> {
  const apiKey = Deno.env.get('CLOUDCONVERT_API_KEY');
  if (!apiKey) {
    console.warn('No CLOUDCONVERT_API_KEY found, returning original buffer');
    return new Uint8Array(inputBuffer);
  }

  try {
    console.log('Starting CloudConvert API request...');
    
    // Create a conversion job
    const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tasks: {
          'import-1': {
            operation: 'import/raw',
            file: new Uint8Array(inputBuffer),
            filename: 'input.mp4'
          },
          'convert-1': {
            operation: 'convert',
            input: ['import-1'],
            output_format: 'mp4',
            engine: 'ffmpeg',
            preset: 'ultrafast',
            video_codec: 'h264',
            crf: 28,
            audio_codec: 'aac',
            audio_bitrate: '128k'
          },
          'export-1': {
            operation: 'export/url',
            input: ['convert-1']
          }
        }
      })
    });

    if (!createJobResponse.ok) {
      throw new Error(`CloudConvert API error: ${createJobResponse.statusText}`);
    }

    const jobResult = await createJobResponse.json();
    console.log('CloudConvert job created:', jobResult);

    // Wait for the export task to complete
    const exportTask = jobResult.tasks.find((task: any) => task.operation === 'export/url');
    if (!exportTask?.result?.files?.[0]?.url) {
      throw new Error('No converted video URL in response');
    }

    // Download the converted file
    const videoResponse = await fetch(exportTask.result.files[0].url);
    if (!videoResponse.ok) {
      throw new Error('Failed to download converted video');
    }

    const convertedBuffer = await videoResponse.arrayBuffer();
    console.log('CloudConvert conversion completed successfully');
    
    return new Uint8Array(convertedBuffer);
  } catch (error) {
    console.error('CloudConvert conversion failed:', error);
    console.warn('Returning original buffer as fallback');
    return new Uint8Array(inputBuffer);
  }
}