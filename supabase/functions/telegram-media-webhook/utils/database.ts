export const saveChannel = async (supabase: any, chat: any, userId: string) => {
  const { error: channelError } = await supabase
    .from('channels')
    .upsert({
      user_id: userId,
      chat_id: chat.id,
      title: chat.title || `Chat ${chat.id}`,
      username: chat.username,
      is_active: true
    }, {
      onConflict: 'chat_id',
      ignoreDuplicates: false,
    });

  if (channelError) {
    console.error('Error saving channel:', channelError);
    throw channelError;
  }
};

export const saveMessage = async (supabase: any, chat: any, message: any, userId: string) => {
  const { error: messageError } = await supabase
    .from('messages')
    .upsert({
      user_id: userId,
      chat_id: chat.id,
      message_id: message.message_id,
      sender_name: message.from?.username || message.from?.first_name || 'Unknown',
      text: message.text || message.caption,
      media_type: message.photo ? 'photo' : message.video ? 'video' : message.document ? 'document' : null,
      media_url: null, // Will be updated after media processing
      public_url: null // Will be updated after media processing
    }, {
      onConflict: 'chat_id,message_id',
      ignoreDuplicates: false,
    });

  if (messageError) {
    console.error('Error saving message:', messageError);
    throw messageError;
  }
};