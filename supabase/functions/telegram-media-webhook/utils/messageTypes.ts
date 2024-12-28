export const determineMessageType = (payload: any): string => {
  const message = payload.message || payload.channel_post || payload.edited_channel_post || payload.edited_message;
  
  if (!message) return 'unknown';
  
  if (message.photo) return 'photo';
  if (message.video) return 'video';
  if (message.document) return 'document';
  if (message.audio) return 'audio';
  if (message.voice) return 'voice';
  if (message.animation) return 'animation';
  if (message.sticker) return 'sticker';
  if (message.text) return 'text';
  
  return 'unknown';
};