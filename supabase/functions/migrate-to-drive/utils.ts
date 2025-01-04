import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const TELEGRAM_MEDIA_FOLDER_ID = "1adMg2GVEDfYk3GBeyi4fRSGVcGJkYH24";

export async function uploadFileToDrive(file: any, accessToken: string) {
  console.log(`Processing file: ${file.file_name}`);
  
  try {
    const response = await fetch(file.file_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from Supabase: ${file.file_name}`);
    }
    const blob = await response.blob();

    const metadata = {
      name: file.file_name,
      mimeType: blob.type,
      parents: [TELEGRAM_MEDIA_FOLDER_ID],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      console.error('Google Drive API Error:', errorData);
      throw new Error(`Failed to upload to Google Drive: ${file.file_name}`);
    }

    return await uploadResponse.json();
  } catch (error) {
    console.error('Error in uploadFileToDrive:', error);
    throw error;
  }
}

export async function deleteFromSupabase(supabase: any, file: any) {
  try {
    const fileUrl = new URL(file.file_url);
    const pathParts = fileUrl.pathname.split('/');
    const bucket = pathParts[1];
    const filePath = pathParts.slice(2).join('/');

    console.log(`Attempting to delete file from bucket: ${bucket}, path: ${filePath}`);

    const { error: deleteError } = await supabase
      .storage
      .from(bucket)
      .remove([filePath]);

    if (deleteError) {
      console.error(`Failed to delete file from Supabase storage: ${file.file_name}`, deleteError);
      return false;
    }
    
    console.log(`Successfully deleted file from Supabase storage: ${file.file_name}`);
    return true;
  } catch (error) {
    console.error('Error in deleteFromSupabase:', error);
    return false;
  }
}
