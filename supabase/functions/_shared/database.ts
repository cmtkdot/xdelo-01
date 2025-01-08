import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MediaMetadata } from "./types.ts";

export const createMediaRecord = async (
  supabase: any,
  userId: string,
  chatId: number,
  fileName: string,
  fileUrl: string,
  mediaType: string,
  caption: string | null,
  metadata: MediaMetadata,
  mediaGroupId?: string,
  publicUrl?: string
) => {
  console.log(`[createMediaRecord] Creating media record for file: ${fileName}`);
  
  try {
    const { data: mediaData, error: mediaError } = await supabase
      .from('media')
      .insert({
        user_id: userId,
        chat_id: chatId,
        file_name: fileName,
        file_url: fileUrl,
        media_type: mediaType,
        caption: caption,
        metadata,
        media_group_id: mediaGroupId,
        public_url: publicUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (mediaError) {
      console.error('[createMediaRecord] Error creating media record:', mediaError);
      throw mediaError;
    }

    console.log(`[createMediaRecord] Successfully created media record: ${mediaData.id}`);
    return mediaData;
  } catch (error) {
    console.error('[createMediaRecord] Error in createMediaRecord:', error);
    throw error;
  }
};

export const logOperation = async (
  supabase: any,
  functionName: string,
  status: 'info' | 'error' | 'success',
  message: string
) => {
  try {
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: functionName,
        status,
        message,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('[logOperation] Error logging operation:', error);
  }
};