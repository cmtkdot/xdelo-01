export const generateSafeFileName = (caption: string | null, extension: string): string => {
  const timestamp = Date.now();
  const safeName = caption 
    ? caption.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 50)
    : 'untitled';
  return `${safeName}_${timestamp}.${extension}`;
};

export const determineMediaType = (message: any): string => {
  if (message.photo) return 'photo';
  if (message.video) return 'video';
  if (message.document) return 'document';
  if (message.audio) return 'audio';
  if (message.voice) return 'voice';
  if (message.animation) return 'animation';
  if (message.sticker) return 'sticker';
  return 'unknown';
};

export const getMediaItem = (message: any): any => {
  if (message.photo) return message.photo[message.photo.length - 1];
  if (message.video) return message.video;
  if (message.document) return message.document;
  if (message.audio) return message.audio;
  if (message.voice) return message.voice;
  if (message.animation) return message.animation;
  if (message.sticker) return message.sticker;
  return null;
};

export const formatMediaMetadata = (mediaItem: any, message: any): any => {
  const metadata: any = {
    telegram_file_id: mediaItem.file_id,
    width: mediaItem.width || null,
    height: mediaItem.height || null,
    file_size: mediaItem.file_size || null,
  };

  // Add mime_type if available (usually for documents)
  if (message.document?.mime_type) {
    metadata.mime_type = message.document.mime_type;
  }

  // Add original filename if available
  if (message.document?.file_name) {
    metadata.original_filename = message.document.file_name;
  }

  return metadata;
};