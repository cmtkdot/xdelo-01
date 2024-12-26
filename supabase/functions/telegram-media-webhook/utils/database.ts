import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const saveChannel = async (supabase: any, chat: any, userId: string) => {
  const { data: channelData, error: channelError } = await supabase
    .from("channels")
    .upsert({
      chat_id: chat.id,
      title: chat.title || `Chat ${chat.id}`,
      username: chat.username,
      is_active: true,
      user_id: userId,
    }, {
      onConflict: 'chat_id'
    })
    .select()
    .single();

  if (channelError) {
    console.error("Error saving channel:", channelError);
    throw channelError;
  }
  
  return channelData;
};

export const saveMessage = async (supabase: any, chat: any, message: any, userId: string) => {
  const { data: messageData, error: messageError } = await supabase
    .from("messages")
    .insert({
      chat_id: chat.id,
      message_id: message.message_id,
      sender_name: message.from?.first_name || "Unknown",
      text: message.text || message.caption || null,
      user_id: userId,
    })
    .select()
    .single();

  if (messageError) {
    console.error("Error saving message:", messageError);
    throw messageError;
  }

  return messageData;
};

export const saveMedia = async (
  supabase: any,
  userId: string,
  chatId: number,
  fileName: string,
  fileUrl: string,
  mediaType: string,
  caption: string | null,
  metadata: any,
  mediaGroupId?: string
) => {
  const { data: mediaData, error: mediaError } = await supabase
    .from("media")
    .insert({
      user_id: userId,
      chat_id: chatId,
      file_name: fileName,
      file_url: fileUrl,
      media_type: mediaType,
      caption,
      metadata,
      media_group_id: mediaGroupId
    })
    .select()
    .single();

  if (mediaError) {
    console.error("Database insert error:", mediaError);
    throw mediaError;
  }

  return mediaData;
};

export const syncMediaGroupCaption = async (supabase: any, mediaGroupId: string, caption: string) => {
  try {
    console.log(`Starting caption sync for media group ${mediaGroupId} with caption "${caption}"`);
    
    // First, get all media items in this group
    const { data: mediaItems, error: fetchError } = await supabase
      .from('media')
      .select('id, caption, media_type')
      .eq('media_group_id', mediaGroupId);
    
    if (fetchError) {
      console.error('Error fetching media group items:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${mediaItems?.length || 0} items in media group ${mediaGroupId}`);
    console.log('Current items:', mediaItems);

    // Update all items in the group regardless of their current caption state
    const { error: updateError } = await supabase
      .from('media')
      .update({ caption })
      .eq('media_group_id', mediaGroupId);

    if (updateError) {
      console.error('Error syncing caption to group:', updateError);
      throw updateError;
    }

    console.log(`Successfully synced caption "${caption}" for media group ${mediaGroupId}`);
  } catch (error) {
    console.error('Failed to sync media group caption:', error);
    throw error;
  }
};