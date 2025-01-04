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
      public_url: publicUrl
    })
    .select()
    .single();

  if (mediaError) {
    console.error('Error creating media record:', mediaError);
    throw mediaError;
  }

  return mediaData;
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
        message
      });
  } catch (error) {
    console.error('Error logging operation:', error);
  }
};