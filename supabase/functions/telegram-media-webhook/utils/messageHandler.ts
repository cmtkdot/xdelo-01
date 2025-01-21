import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const handleMessage = async (
  supabase: ReturnType<typeof createClient>,
  message: any
) => {
  try {
    if (!message.chat?.id) {
      throw new Error('No chat ID in message');
    }

    const messageData = {
      user_id: message.from?.id ? message.from.id.toString() : 'system',
      chat_id: message.chat.id,
      message_id: message.message_id,
      sender_name: message.from?.first_name || 'Unknown',
      text: message.text || message.caption || null,
      media_type: message.photo ? 'photo' : 
                 message.video ? 'video' : 
                 message.document ? 'document' : 
                 message.animation ? 'animation' : null,
      media_url: null, // This will be updated by the media processor
      created_at: new Date(message.date * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('messages')
      .upsert(messageData, {
        onConflict: 'chat_id,message_id'
      });

    if (error) {
      throw error;
    }

    console.log('[handleMessage] Message processed successfully');
  } catch (error) {
    console.error('[handleMessage] Error:', error);
    throw error;
  }
};