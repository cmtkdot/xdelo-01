import { encode } from 'https://deno.land/x/base64@v0.2.1/mod.ts';

export async function convertToMp4(inputBuffer: Uint8Array): Promise<Uint8Array> {
  try {
    console.log('Starting video conversion to MP4');
    
    const API_KEY = Deno.env.get('CLOUDCONVERT_API_KEY');
    if (!API_KEY) {
      console.warn('No CLOUDCONVERT_API_KEY found, returning original buffer');
      return inputBuffer;
    }

    console.log('Converting input buffer to base64...');
    const base64Input = encode(inputBuffer);

    const job = {
      tasks: {
        'import-1': {
          operation: 'import/base64',
          file: base64Input,
          filename: 'input.mp4'
        },
        'task-1': {
          operation: 'convert',
          input: 'import-1',
          output_format: 'mp4',
          engine: 'ffmpeg',
          preset: 'medium'
        },
        'export-1': {
          operation: 'export/url',
          input: 'task-1'
        }
      }
    };

    console.log('Sending conversion request to CloudConvert...');
    const response = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(job)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CloudConvert API Error:', errorText);
      throw new Error(`Video conversion failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Conversion job created:', result);
    
    // Get the converted video URL
    const exportTask = result.tasks.find((task: any) => task.name === 'export-1');
    if (!exportTask?.result?.files?.[0]?.url) {
      console.error('No converted video URL in response:', result);
      throw new Error('No converted video URL found');
    }

    console.log('Downloading converted video...');
    const videoResponse = await fetch(exportTask.result.files[0].url);
    if (!videoResponse.ok) {
      throw new Error('Failed to download converted video');
    }

    const convertedBuffer = await videoResponse.arrayBuffer();
    console.log('Successfully converted and downloaded video');
    return new Uint8Array(convertedBuffer);
  } catch (error) {
    console.error('Error in video conversion:', error);
    console.warn('Falling back to original buffer');
    return inputBuffer;
  }
}