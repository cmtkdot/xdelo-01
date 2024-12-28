import { CloudConvert } from 'https://esm.sh/cloudconvert@3.0.0';

export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

export const convertToMp4 = async (inputBuffer: ArrayBuffer): Promise<Uint8Array> => {
  const apiKey = Deno.env.get('CLOUDCONVERT_API_KEY');
  
  if (!apiKey) {
    console.warn('CloudConvert API key not found, skipping video conversion');
    return new Uint8Array(inputBuffer);
  }

  try {
    console.log('Initializing CloudConvert...');
    const cloudConvert = new CloudConvert(apiKey);

    // Create a job to convert the video
    const job = await cloudConvert.jobs.create({
      tasks: {
        'import-1': {
          operation: 'import/raw',
          file: new Blob([inputBuffer]),
          filename: 'input.mov'
        },
        'convert-1': {
          operation: 'convert',
          input: ['import-1'],
          output_format: 'mp4',
          video_codec: 'h264',
          audio_codec: 'aac',
          engine: 'ffmpeg',
          preset: 'medium',
          video_bitrate: 1000,
          audio_bitrate: 128,
          crf: 23
        },
        'export-1': {
          operation: 'export/url',
          input: ['convert-1']
        }
      }
    });

    console.log('Conversion job created:', job.id);

    // Wait for the job to complete
    const jobResult = await cloudConvert.jobs.wait(job.id);
    console.log('Conversion job completed');

    // Get the exported file URL
    const file = jobResult.tasks.find(task => task.operation === 'export/url');
    if (!file?.result?.files?.[0]?.url) {
      throw new Error('No output file URL found');
    }

    // Download the converted file
    const response = await fetch(file.result.files[0].url);
    if (!response.ok) {
      throw new Error('Failed to download converted file');
    }

    const convertedBuffer = await response.arrayBuffer();
    console.log('Successfully downloaded converted file');

    return new Uint8Array(convertedBuffer);
  } catch (error) {
    console.error('Error in video conversion:', error);
    console.log('Returning original buffer as fallback');
    return new Uint8Array(inputBuffer);
  }
};