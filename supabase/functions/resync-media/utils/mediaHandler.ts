import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAndDownloadTelegramFile } from "../../_shared/telegram.ts";
import { logMessage } from "./logging.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

export const fetchMediaDetails = async (id: string) => {
  const { data: media, error: mediaError } = await supabase
    .from('media')
    .select('*, channels!inner(*)')
    .eq('id', id)
    .single();

  if (mediaError) throw new Error(`Failed to fetch media: ${mediaError.message}`);
  if (!media) throw new Error(`Media not found: ${id}`);
  
  return media;
};

export const downloadFromTelegram = async (fileId: string, botToken: string) => {
  try {
    const { buffer } = await getAndDownloadTelegramFile(fileId, botToken);
    return buffer;
  } catch (error) {
    console.error('Error downloading from Telegram:', error);
    throw new Error(`Failed to download from Telegram: ${error.message}`);
  }
};

export const uploadToStorage = async (fileName: string, fileBuffer: ArrayBuffer, contentType: string) => {
  const timestamp = Date.now();
  const newFileName = `${fileName.split('.')[0]}_${timestamp}.${fileName.split('.').pop()}`;

  const { error: uploadError } = await supabase.storage
    .from('telegram-media')
    .upload(newFileName, fileBuffer, {
      contentType: contentType || 'application/octet-stream',
      upsert: false
    });

  if (uploadError) throw new Error(`Failed to upload file: ${uploadError.message}`);
  
  return newFileName;
};

export const updateMediaRecord = async (id: string, newFileName: string) => {
  const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${newFileName}`;
  
  const { error: updateError } = await supabase
    .from('media')
    .update({
      file_name: newFileName,
      file_url: publicUrl,
      public_url: publicUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (updateError) throw new Error(`Failed to update media record: ${updateError.message}`);
  
  return publicUrl;
};