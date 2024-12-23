import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { fileUrl, fileName, accessToken } = await req.json()
    console.log('Received request to upload:', { fileName })

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Download file from Supabase URL
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch file from Supabase')
    }
    const blob = await response.blob()

    // Prepare metadata for Google Drive
    const metadata = {
      name: fileName,
      mimeType: blob.type,
    }

    // Create form data for the Google Drive API
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', blob)

    // Upload to Google Drive
    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload to Google Drive')
    }

    const result = await uploadResponse.json()
    console.log('Successfully uploaded to Google Drive:', result)

    // Get the Google Drive file link
    const driveFileUrl = `https://drive.google.com/file/d/${result.id}/view`;

    // Update the media record with Google Drive information
    const { error: updateError } = await supabase
      .from('media')
      .update({
        google_drive_id: result.id,
        google_drive_url: driveFileUrl
      })
      .eq('file_url', fileUrl);

    if (updateError) {
      console.error('Error updating media record:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileId: result.id,
        fileUrl: driveFileUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})