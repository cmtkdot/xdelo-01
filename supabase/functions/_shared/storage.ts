import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const uploadToStorage = async (
  supabase: any,
  fileName: string,
  fileContent: ArrayBuffer,
  contentType: string
): Promise<string> => {
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('telegram-media')
    .upload(fileName, fileContent, {
      contentType,
      upsert: false,
      cacheControl: '3600'
    });

  if (uploadError) {
    console.error('Error uploading to storage:', uploadError);
    throw uploadError;
  }

  const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${fileName}`;
  return publicUrl;
};

export const generateSafeFileName = (baseName: string, extension: string): string => {
  const safeName = baseName.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_');
  return `${safeName}.${extension}`;
};