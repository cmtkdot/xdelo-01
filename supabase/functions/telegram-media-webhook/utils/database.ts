export const saveChannel = async (supabase: any, chat: any, userId: string) => {
  if (!chat) return null;
  
  const channelData = {
    user_id: userId,
    chat_id: chat.id,
    title: chat.title || `Chat ${chat.id}`,
    username: chat.username,
    is_active: true
  };

  const { error } = await supabase
    .from('channels')
    .upsert(channelData, {
      onConflict: 'chat_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error saving channel:', error);
    throw error;
  }

  return channelData;
};

export const saveMessage = async (supabase: any, chat: any, message: any, userId: string) => {
  if (!chat || !message) return null;

  const messageData = {
    user_id: userId,
    chat_id: chat.id,
    message_id: message.message_id,
    sender_name: message.from?.username || message.from?.first_name || 'Unknown',
    text: message.text || message.caption,
    media_type: message.photo ? 'photo' : message.video ? 'video' : message.document ? 'document' : null,
    media_url: null, // Will be updated after media processing
    public_url: null // Will be updated after media processing
  };

  const { error } = await supabase
    .from('messages')
    .upsert(messageData, {
      onConflict: 'chat_id,message_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error saving message:', error);
    throw error;
  }

  return messageData;
};