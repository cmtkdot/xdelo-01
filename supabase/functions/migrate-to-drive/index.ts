import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders, uploadFileToDrive, deleteFromSupabase } from './utils.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting migration process...');
    
    // Safely parse the request body
    let requestBody;
    try {
      const text = await req.text();
      console.log('Raw request body:', text);
      requestBody = JSON.parse(text);
      console.log('Parsed request body:', requestBody);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body format',
          details: parseError.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    const { accessToken, selectedIds } = requestBody;
    
    if (!accessToken) {
      console.error('Missing access token');
      return new Response(
        JSON.stringify({ error: 'Access token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
      console.error('Invalid or empty selectedIds array');
      return new Response(
        JSON.stringify({ error: 'Selected IDs must be a non-empty array' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing ${selectedIds.length} files for migration`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch media files that need to be migrated
    const { data: mediaFiles, error: fetchError } = await supabase
      .from('media')
      .select('*')
      .in('id', selectedIds)
      .is('google_drive_id', null);

    if (fetchError) {
      console.error('Failed to fetch media files:', fetchError);
      throw new Error(`Failed to fetch media files: ${fetchError.message}`);
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No files found to migrate' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${mediaFiles.length} files to migrate`);

    const results = [];
    
    for (const file of mediaFiles) {
      try {
        console.log(`Processing file: ${file.file_name}`);
        const result = await uploadFileToDrive(file, accessToken);
        console.log(`Successfully uploaded to Google Drive: ${file.file_name}, ID: ${result.id}`);

        const driveFileUrl = `https://drive.google.com/file/d/${result.id}/view`;

        // Update the media record with Google Drive information
        const { error: updateError } = await supabase
          .from('media')
          .update({
            google_drive_id: result.id,
            google_drive_url: driveFileUrl
          })
          .eq('id', file.id);

        if (updateError) {
          console.error('Failed to update media record:', updateError);
          throw new Error(`Failed to update media record: ${updateError.message}`);
        }

        // Try to delete the file from Supabase storage
        const deleted = await deleteFromSupabase(supabase, file);

        results.push({
          success: true,
          fileName: file.file_name,
          driveUrl: driveFileUrl,
          deleted
        });

      } catch (error) {
        console.error(`Error processing file ${file.file_name}:`, error);
        results.push({
          success: false,
          fileName: file.file_name,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Migration completed. ${successCount} files successfully migrated`);

    return new Response(
      JSON.stringify({ 
        message: `Migration completed. ${successCount}/${results.length} files migrated successfully`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});