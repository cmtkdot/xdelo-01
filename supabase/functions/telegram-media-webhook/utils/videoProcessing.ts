import { FFmpeg } from 'https://deno.land/x/ffmpeg@v1.0.0/mod.ts';

export async function convertToMp4(inputBuffer: Uint8Array): Promise<Uint8Array> {
  try {
    const ffmpeg = new FFmpeg();
    
    // Write input buffer to temporary file
    const tempInputPath = await Deno.makeTempFile({ suffix: '.mp4' });
    await Deno.writeFile(tempInputPath, inputBuffer);
    
    // Set output path
    const tempOutputPath = await Deno.makeTempFile({ suffix: '.mp4' });
    
    // Convert video
    await ffmpeg.run([
      '-i', tempInputPath,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-c:a', 'aac',
      tempOutputPath
    ]);
    
    // Read converted file
    const outputBuffer = await Deno.readFile(tempOutputPath);
    
    // Cleanup
    await Deno.remove(tempInputPath);
    await Deno.remove(tempOutputPath);
    
    return outputBuffer;
  } catch (error) {
    console.error('Error converting video:', error);
    throw new Error(`Video conversion failed: ${error.message}`);
  }
}