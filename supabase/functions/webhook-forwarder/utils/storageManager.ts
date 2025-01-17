import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateFileHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkDuplicateContent(supabase: any, fileHash: string): Promise<any> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('metadata->file_hash', fileHash)
    .maybeSingle();

  if (error) {
    console.error('Error checking for duplicate content:', error);
    return null;
  }
  return data;
}

async function deleteFromStorage(supabase: any, fileName: string): Promise<void> {
  const { error } = await supabase.storage
    .from('telegram-media')
    .remove([fileName]);
  
  if (error) {
    console.error('Error deleting file from storage:', error);
  }
}
