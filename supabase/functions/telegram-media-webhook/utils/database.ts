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
  console.log(`Saving message ${message.message_id} from chat ${chat.id}`);
  
  const { data: messageData, error: messageError } = await supabase
    .from("messages")
    .upsert({
      chat_id: chat.id,
      message_id: message.message_id,
      sender_name: message.from?.first_name || "Unknown",
      text: message.text || message.caption || null,
      user_id: userId,
    }, {
      onConflict: 'chat_id,message_id',
      ignoreDuplicates: false // This will update existing records
    })
    .select()
    .single();

  if (messageError) {
    console.error("Error saving message:", messageError);
    throw messageError;
  }

  console.log(`Successfully saved/updated message ${message.message_id}`);
  return messageData;
};

export const checkForDuplicateMedia = async (supabase: any, telegramFileId: string) => {
  console.log(`Checking for duplicate media with Telegram file ID: ${telegramFileId}`);
  
  const { data, error } = await supabase
    .from('media')
    .select('id, file_name, caption')
    .filter('metadata->telegram_file_id', 'eq', telegramFileId)
    .maybeSingle();

  if (error) {
    console.error('Error checking for duplicate media:', error);
    throw error;
  }

  if (data) {
    console.log(`Found existing media with ID ${data.id} and filename ${data.file_name}`);
  } else {
    console.log('No duplicate media found');
  }

  return data;
};

export const updateDuplicateMedia = async (supabase: any, mediaId: string, newCaption: string | null) => {
  console.log(`Updating duplicate media ${mediaId} with new caption: "${newCaption}"`);
  
  const { data, error } = await supabase
    .from('media')
    .update({ caption: newCaption })
    .eq('id', mediaId)
    .select()
    .single();

  if (error) {
    console.error('Error updating duplicate media:', error);
    throw error;
  }

  console.log(`Successfully updated media ${mediaId} with new caption`);
  return data;
};

export const deleteDuplicateMedia = async (supabase: any, telegramFileId: string, keepNewest: boolean = true) => {
  console.log(`Finding duplicates for Telegram file ID: ${telegramFileId}`);
  
  // Get all duplicates ordered by creation date
  const { data: duplicates, error: fetchError } = await supabase
    .from('media')
    .select('id, file_name, created_at')
    .filter('metadata->telegram_file_id', 'eq', telegramFileId)
    .order('created_at', { ascending: !keepNewest }); // Order based on which version to keep

  if (fetchError) {
    console.error('Error fetching duplicates:', fetchError);
    throw fetchError;
  }

  if (!duplicates || duplicates.length <= 1) {
    console.log('No duplicates found to delete');
    return null;
  }

  // Keep the first item (either newest or oldest based on keepNewest parameter)
  const [keepItem, ...itemsToDelete] = duplicates;
  
  console.log(`Keeping media item ${keepItem.id}, deleting ${itemsToDelete.length} duplicates`);

  // Delete all duplicates except the one we're keeping
  const { error: deleteError } = await supabase
    .from('media')
    .delete()
    .in('id', itemsToDelete.map(item => item.id));

  if (deleteError) {
    console.error('Error deleting duplicates:', deleteError);
    throw deleteError;
  }

  console.log(`Successfully deleted ${itemsToDelete.length} duplicate items`);
  return {
    kept: keepItem,
    deleted: itemsToDelete
  };
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
  // Check for duplicate before saving
  const existingMedia = await checkForDuplicateMedia(supabase, metadata.telegram_file_id);
  
  if (existingMedia) {
    console.log(`Found duplicate media with file ID: ${metadata.telegram_file_id}`);
    
    // If there's a new caption, update the existing media
    if (caption !== null && caption !== existingMedia.caption) {
      console.log(`Updating caption for existing media from "${existingMedia.caption}" to "${caption}"`);
      return await updateDuplicateMedia(supabase, existingMedia.id, caption);
    }
    
    console.log(`Skipping duplicate media upload and keeping existing caption: "${existingMedia.caption}"`);
    return existingMedia;
  }

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
    console.log(`Starting caption sync for media group ${mediaGroupId}`);
    console.log(`Caption to sync: "${caption}"`);
    
    // First, get all media items in this group
    const { data: mediaItems, error: fetchError } = await supabase
      .from('media')
      .select('id, caption, media_type, file_name')
      .eq('media_group_id', mediaGroupId);
    
    if (fetchError) {
      console.error('Error fetching media group items:', fetchError);
      throw fetchError;
    }

    console.log('Current media items in group:', mediaItems);

    if (!mediaItems || mediaItems.length === 0) {
      console.log('No media items found in group');
      return;
    }

    // Log the media types in the group for debugging
    console.log('Media types in group:', mediaItems.map(item => ({
      id: item.id,
      type: item.media_type,
      currentCaption: item.caption
    })));

    // Update each item individually to ensure the update goes through
    for (const item of mediaItems) {
      console.log(`Processing media item ${item.id} (${item.media_type})`);
      console.log(`Current caption: "${item.caption}", New caption: "${caption}"`);
      
      // Always update the caption regardless of media type
      const { error: updateError } = await supabase
        .from('media')
        .update({ caption })
        .eq('id', item.id);

      if (updateError) {
        console.error(`Error updating caption for item ${item.id}:`, updateError);
        throw updateError;
      }
      
      console.log(`Successfully updated caption for ${item.media_type} item ${item.id}`);
    }

    console.log(`Completed caption sync for all ${mediaItems.length} items in media group ${mediaGroupId}`);
  } catch (error) {
    console.error('Failed to sync media group caption:', error);
    throw error;
  }
};