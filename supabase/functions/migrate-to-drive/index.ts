import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders, createJWT, uploadFileToDrive, deleteFromSupabase } from './utils.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
    
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Invalid service account credentials');
    }

    console.log('Starting migration with service account:', credentials.client_email);

    const { data: mediaFiles, error: fetchError } = await supabase
      .from('media')
      .select('*')
      .is('google_drive_id', null)

    if (fetchError) {
      console.error('Failed to fetch media files:', fetchError);
      throw new Error(`Failed to fetch media files: ${fetchError.message}`);
    }

    console.log(`Found ${mediaFiles?.length || 0} files to migrate`);

    const accessToken = await createJWT(credentials);
    const results = [];
    
    for (const file of mediaFiles || []) {
      try {
        const result = await uploadFileToDrive(file, accessToken);
        console.log(`Successfully uploaded to Google Drive: ${file.file_name}, ID: ${result.id}`);

        const driveFileUrl = `https://drive.google.com/file/d/${result.id}/view`;

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
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});