import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const uploadToStorage = async (
  supabase: any,
  fileName: string,
  fileContent: ArrayBuffer,
  contentType: string
): Promise<string> => {
  console.log(`[uploadToStorage] Starting upload for file: ${fileName}`);
  
  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('telegram-media')
      .upload(fileName, fileContent, {
        contentType,
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('[uploadToStorage] Error uploading to storage:', uploadError);
      throw uploadError;
    }

    console.log(`[uploadToStorage] Successfully uploaded file: ${fileName}`);
    const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('[uploadToStorage] Error in uploadToStorage:', error);
    throw error;
  }
};

export const generateSafeFileName = (baseName: string, extension: string): string => {
  // Remove non-ASCII characters and spaces
  const safeName = baseName
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
  
  // Ensure extension is lowercase and clean
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  return `${safeName}.${safeExtension}`;
};