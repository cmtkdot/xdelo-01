import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SyncRequest {
  chatIds?: number[];
  mediaGroupId?: string;
}

export const validateRequest = async (req: Request) => {
  try {
    const requestText = await req.text();
    if (!requestText) {
      throw new Error('Empty request body');
    }

    console.log('Request body:', requestText);
    const data: SyncRequest = JSON.parse(requestText);
    
    if (!data.chatIds?.length && !data.mediaGroupId) {
      throw new Error('Please provide either chatIds array or mediaGroupId');
    }

    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in request body: ${error.message}`);
    }
    throw error;
  }
};

export const validateMediaRecords = async (supabase: any, mediaGroupId?: string, chatIds?: number[]) => {
  let mediaQuery = supabase
    .from('media')
    .select('*')
    .not('metadata', 'is', null);

  if (mediaGroupId) {
    mediaQuery = mediaQuery.eq('media_group_id', mediaGroupId);
    console.log(`Fetching media records for group ${mediaGroupId}`);
  } else if (chatIds) {
    mediaQuery = mediaQuery.in('chat_id', chatIds);
    console.log(`Fetching media records for channels:`, chatIds);
  }

  const { data: mediaRecords, error: fetchError } = await mediaQuery;

  if (fetchError) throw fetchError;
  if (!mediaRecords?.length) {
    return { message: 'No media records found to process' };
  }

  return mediaRecords;
};