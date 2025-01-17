import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function checkFileUniqueId(supabase: any, fileUniqueId: string) {
  console.log(`[checkFileUniqueId] Checking for file_unique_id: ${fileUniqueId}`);
  
  try {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('file_unique_id', fileUniqueId)
      .maybeSingle();

    if (error) {
      console.error('[checkFileUniqueId] Error checking file_unique_id:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[checkFileUniqueId] Database error:', error);
    throw new Error(`Failed to check for duplicate file: ${error.message}`);
  }
}

export async function calculateFileHash(buffer: ArrayBuffer): Promise<string> {
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('[calculateFileHash] Error calculating hash:', error);
    throw new Error(`Failed to calculate file hash: ${error.message}`);
  }
}

export async function checkContentHash(supabase: any, hash: string) {
  console.log(`[checkContentHash] Checking for content hash: ${hash}`);
  
  try {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('metadata->content_hash', hash)
      .maybeSingle();

    if (error) {
      console.error('[checkContentHash] Error checking content hash:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[checkContentHash] Database error:', error);
    throw new Error(`Failed to check content hash: ${error.message}`);
  }
}