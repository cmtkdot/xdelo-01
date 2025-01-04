export const isVideoFile = (fileName: string): boolean => {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv'];
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return videoExtensions.includes(ext);
};

export const isMovFile = (fileName: string): boolean => {
  return fileName.toLowerCase().endsWith('.mov');
};

export const convertToMp4 = async (inputBuffer: ArrayBuffer): Promise<Uint8Array> => {
  // For now, we'll return the original buffer since FFmpeg is not available in Deno
  // In a production environment, you would want to use a cloud service for video conversion
  console.warn('Video conversion is currently disabled - returning original buffer');
  return new Uint8Array(inputBuffer);
};