import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TELEGRAM_MEDIA_FOLDER_ID = "1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { accessToken } = body

    if (!accessToken) {
      console.error('No access token provided')
      throw new Error('Access token is required')
    }

    console.log('Starting migration to Google Drive with valid access token')

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all media files that haven't been migrated to Google Drive
    const { data: mediaFiles, error: fetchError } = await supabase
      .from('media')
      .select('*')
      .is('google_drive_id', null)

    if (fetchError) {
      console.error('Failed to fetch media files:', fetchError)
      throw new Error(`Failed to fetch media files: ${fetchError.message}`)
    }

    console.log(`Found ${mediaFiles?.length || 0} files to migrate`)

    const results = []
    
    // Process each file
    for (const file of mediaFiles || []) {
      try {
        console.log(`Processing file: ${file.file_name}`)
        
        // Download file from Supabase URL
        const response = await fetch(file.file_url)
        if (!response.ok) {
          throw new Error(`Failed to fetch file from Supabase: ${file.file_name}`)
        }
        const blob = await response.blob()

        // Prepare metadata for Google Drive
        const metadata = {
          name: file.file_name,
          mimeType: blob.type,
          parents: [TELEGRAM_MEDIA_FOLDER_ID]
        }

        // Create form data for the Google Drive API
        const form = new FormData()
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
        form.append('file', blob)

        console.log('Uploading to Google Drive:', file.file_name)
        
        // Upload to Google Drive
        const uploadResponse = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: form,
          }
        )

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.text()
          console.error('Google Drive API Error:', errorData)
          throw new Error(`Failed to upload to Google Drive: ${file.file_name}`)
        }

        const result = await uploadResponse.json()
        console.log(`Successfully uploaded to Google Drive: ${file.file_name}, ID: ${result.id}`)

        // Get the Google Drive file link
        const driveFileUrl = `https://drive.google.com/file/d/${result.id}/view`

        // Update the media record with Google Drive information
        const { error: updateError } = await supabase
          .from('media')
          .update({
            google_drive_id: result.id,
            google_drive_url: driveFileUrl
          })
          .eq('id', file.id)

        if (updateError) {
          console.error('Failed to update media record:', updateError)
          throw new Error(`Failed to update media record: ${updateError.message}`)
        }

        results.push({
          success: true,
          fileName: file.file_name,
          driveUrl: driveFileUrl
        })

      } catch (error) {
        console.error(`Error processing file ${file.file_name}:`, error)
        results.push({
          success: false,
          fileName: file.file_name,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`Migration completed. ${successCount} files successfully migrated`)

    return new Response(
      JSON.stringify({ 
        message: `Migration completed. ${successCount}/${results.length} files migrated successfully`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})