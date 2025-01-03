export const generateSafeFileName = (caption: string | null, extension: string): string => {
  const timestamp = Date.now();
  const safeName = caption 
    ? caption.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 50)
    : 'untitled';
  
  return `${safeName}__${timestamp}.${extension}`;
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

export const getContentType = (fileName: string, mediaType: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    default:
      // If we can't determine from extension, use mediaType
      switch (mediaType) {
        case 'photo':
          return 'image/jpeg';
        case 'video':
          return 'video/mp4';
        default:
          return 'application/octet-stream';
      }
  }
};

export const formatMediaMetadata = (mediaItem: any, message: any): Record<string, any> => {
  if (!mediaItem || typeof mediaItem !== 'object') {
    console.error('Invalid mediaItem:', mediaItem);
    return {};
  }

  try {
    const metadata: Record<string, any> = {
      telegram_file_id: mediaItem.file_id || null,
      width: mediaItem.width || null,
      height: mediaItem.height || null,
      file_size: mediaItem.file_size || null,
      message_id: message.message_id || null
    };

    Object.keys(metadata).forEach(key => {
      if (metadata[key] === null) {
        delete metadata[key];
      }
    });

    if (message.document?.mime_type) {
      metadata.mime_type = message.document.mime_type;
    }

    if (message.document?.file_name) {
      metadata.original_filename = message.document.file_name;
    }

    JSON.stringify(metadata);
    
    return metadata;
  } catch (error) {
    console.error('Error formatting metadata:', error);
    return {};
  }
};

export const generatePublicUrl = (bucketName: string, fileName: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
};