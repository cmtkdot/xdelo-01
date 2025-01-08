export const validateRequest = (req: Request) => {
  const contentType = req.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Content-Type must be application/json');
  }
};

export const validateMediaGroup = (mediaGroup: any[]) => {
  if (!mediaGroup || mediaGroup.length === 0) {
    throw new Error('Invalid media group');
  }

  // Ensure all items have necessary metadata
  mediaGroup.forEach(media => {
    if (!media.metadata?.message_id || !media.chat_id) {
      throw new Error(`Invalid metadata for media ${media.id}`);
    }
  });

  return true;
};