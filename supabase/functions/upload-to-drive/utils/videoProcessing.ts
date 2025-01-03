import { FFmpeg } from 'https://esm.sh/@ffmpeg/ffmpeg@0.12.7';
import { CloudConvert } from 'https://esm.sh/cloudconvert@3.0.0';

export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

export const convertToMp4 = async (inputBuffer: ArrayBuffer): Promise<Uint8Array> => {
  try {
    console.log('Attempting FFmpeg conversion first...');
    return await convertWithFFmpeg(inputBuffer);
  } catch (error) {
    console.log('FFmpeg conversion failed, falling back to CloudConvert:', error);
    return await convertWithCloudConvert(inputBuffer);
  }
};

const convertWithFFmpeg = async (inputBuffer: ArrayBuffer): Promise<Uint8Array> => {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();
  
  console.log('Starting FFmpeg conversion...');
  
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
};

const convertWithCloudConvert = async (inputBuffer: ArrayBuffer): Promise<Uint8Array> => {
  const apiKey = Deno.env.get('CLOUDCONVERT_API_KEY');
  if (!apiKey) {
    throw new Error('CloudConvert API key not found');
  }

  console.log('Starting CloudConvert conversion...');
  const cloudConvert = new CloudConvert(apiKey);

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

  console.log('Waiting for CloudConvert job completion...');
  const jobResult = await cloudConvert.jobs.wait(job.id);

  const file = jobResult.tasks.find(task => task.operation === 'export/url');
  if (!file?.result?.files?.[0]?.url) {
    throw new Error('No output file URL found from CloudConvert');
  }

  const response = await fetch(file.result.files[0].url);
  if (!response.ok) {
    throw new Error('Failed to download converted file from CloudConvert');
  }

  const convertedBuffer = await response.arrayBuffer();
  console.log('CloudConvert conversion completed successfully');

  return new Uint8Array(convertedBuffer);
};