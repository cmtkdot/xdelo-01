import { FFmpeg } from 'https://esm.sh/@ffmpeg/ffmpeg@0.12.7'

export const isVideoFile = (mimeType: string) => {
  return mimeType.startsWith('video/');
};

export const convertToMp4 = async (inputBuffer: ArrayBuffer, fileName: string): Promise<Blob> => {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();
  
  console.log('Starting video conversion for:', fileName);
  
  const inputUint8Array = new Uint8Array(inputBuffer);
  await ffmpeg.writeFile('input', inputUint8Array);
  
  await ffmpeg.exec(['-i', 'input', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', 'output.mp4']);
  
  const data = await ffmpeg.readFile('output.mp4');
  console.log('Video conversion completed');
  
  return new Blob([data], { type: 'video/mp4' });
};