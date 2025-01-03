import { FFmpeg } from 'https://esm.sh/@ffmpeg/ffmpeg@0.12.7';

export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

export const convertToMp4 = async (inputBuffer: ArrayBuffer): Promise<Uint8Array> => {
  try {
    console.log('Starting FFmpeg conversion...');
    const ffmpeg = new FFmpeg();
    await ffmpeg.load();
    
    const inputUint8Array = new Uint8Array(inputBuffer);
    await ffmpeg.writeFile('input', inputUint8Array);
    
    await ffmpeg.exec([
      '-i', 'input',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
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
    console.log('Starting CloudConvert conversion...');
    
    const response = await fetch('https://api.cloudconvert.com/v2/jobs', {
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
            filename: 'input.mov'
          },
          'convert-1': {
            operation: 'convert',
            input: ['import-1'],
            output_format: 'mp4',
            engine: 'ffmpeg',
            preset: 'medium',
            video_codec: 'h264',
            audio_codec: 'aac',
            video_bitrate: '1000k',
            audio_bitrate: '128k',
            crf: 23
          },
          'export-1': {
            operation: 'export/url',
            input: ['convert-1']
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`CloudConvert API error: ${response.statusText}`);
    }

    const result = await response.json();
    const exportTask = result.tasks.find((task: any) => task.operation === 'export/url');
    
    if (!exportTask?.result?.files?.[0]?.url) {
      throw new Error('No converted video URL in response');
    }

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