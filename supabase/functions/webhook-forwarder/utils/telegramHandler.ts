import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function extractMediaInfo(message: any) {
  const mediaTypes = ['photo', 'video', 'document', 'animation'];
  let mediaInfo = null;

  for (const type of mediaTypes) {
    if (message[type]) {
      const media = type === 'photo' ? message[type][message[type].length - 1] : message[type];
      mediaInfo = {
        file_id: media.file_id,
        file_unique_id: media.file_unique_id,
        mime_type: type === 'photo' ? 'image/jpeg' : media.mime_type,
        file_size: media.file_size,
        width: media.width,
        height: media.height
      };
      break;
    }
  }

  return mediaInfo;
}

export async function downloadTelegramFile(fileId: string, botToken: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get file info: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.ok || !data.result.file_path) {
    throw new Error('Failed to get file path from Telegram');
  }

  const filePath = data.result.file_path;
  const fileResponse = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${filePath}`
  );

  if (!fileResponse.ok) {
    throw new Error(`Failed to download file: ${fileResponse.statusText}`);
  }

  const buffer = await fileResponse.arrayBuffer();
  return { buffer, filePath };
}

export async function syncMessageCaptions(supabase: any, mediaGroupId: string, botToken: string) {
  if (!mediaGroupId) return;

  console.log('[syncMessageCaptions] Syncing captions for media group:', mediaGroupId);

  try {
    // Get all media in the group
    const { data: groupMedia, error: fetchError } = await supabase
      .from('media')
      .select('*')
      .eq('media_group_id', mediaGroupId);

    if (fetchError) throw fetchError;

    if (!groupMedia || groupMedia.length === 0) {
      console.log('[syncMessageCaptions] No media found in group');
      return;
    }

    // Get the latest caption from the group
    const latestMedia = groupMedia.reduce((latest: any, current: any) => {
      if (!latest || new Date(current.created_at) > new Date(latest.created_at)) {
        return current;
      }
      return latest;
    });

    if (!latestMedia?.metadata?.message_id) {
      console.log('[syncMessageCaptions] No message ID found for caption sync');
      return;
    }

    // Get the message from Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMessage?chat_id=${latestMedia.chat_id}&message_id=${latestMedia.metadata.message_id}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get message: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error('Failed to get message from Telegram');
    }

    const caption = data.result.caption || '';

    // Update all media in the group with the same caption
    const { error: updateError } = await supabase
      .from('media')
      .update({
        caption: caption,
        updated_at: new Date().toISOString()
      })
      .eq('media_group_id', mediaGroupId);

    if (updateError) throw updateError;

    console.log('[syncMessageCaptions] Successfully synced captions for media group');
  } catch (error) {
    console.error('[syncMessageCaptions] Error syncing captions:', error);
    throw error;
  }
}