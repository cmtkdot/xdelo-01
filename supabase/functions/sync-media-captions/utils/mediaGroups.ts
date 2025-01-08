import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logOperation } from "../../_shared/database.ts";

export const getMediaGroups = async (supabase: any) => {
  const { data: mediaGroups, error } = await supabase
    .from('media')
    .select('*')
    .not('media_group_id', 'is', null)
    .order('media_group_id');

  if (error) {
    console.error('Error fetching media groups:', error);
    throw error;
  }

  // Group media by media_group_id
  const groupedMedia = mediaGroups.reduce((acc: Record<string, any[]>, media: any) => {
    const groupId = media.media_group_id;
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(media);
    return acc;
  }, {});

  return groupedMedia;
};

export const updateMediaGroupCaptions = async (
  supabase: any,
  groupId: string,
  caption: string | null
) => {
  try {
    const { error } = await supabase
      .from('media')
      .update({ 
        caption,
        updated_at: new Date().toISOString()
      })
      .eq('media_group_id', groupId);

    if (error) throw error;

    await logOperation(
      supabase,
      'sync-media-captions',
      'success',
      `Updated captions for media group ${groupId}`
    );

    return true;
  } catch (error) {
    console.error(`Error updating media group ${groupId}:`, error);
    await logOperation(
      supabase,
      'sync-media-captions',
      'error',
      `Failed to update media group ${groupId}: ${error.message}`
    );
    return false;
  }
};