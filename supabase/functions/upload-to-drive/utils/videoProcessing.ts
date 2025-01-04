import { FFmpeg } from 'https://esm.sh/@ffmpeg/ffmpeg@0.12.7';

export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

export const isMovFile = (fileName: string): boolean => {
  return fileName.toLowerCase().endsWith('.mov');
};

export const convertToMp4 = async (inputBuffer: ArrayBuffer): Promise<Uint8Array> => {
  try {
    console.log('Starting FFmpeg conversion...');
    const ffmpeg = new FFmpeg();
    await ffmpeg.load();
    
    const inputArray = new Uint8Array(inputBuffer);
    await ffmpeg.writeFile('input.mov', inputArray);
    
    // Convert MOV to MP4 using FFmpeg
    await ffmpeg.exec([
      '-i', 'input.mov',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '128k',
      'output.mp4'
    ]);
    
    const data = await ffmpeg.readFile('output.mp4');
    console.log('FFmpeg conversion completed successfully');
    
    return new Uint8Array(data);
  } catch (error) {
    console.error('FFmpeg conversion failed:', error);
    throw error;
  }
};