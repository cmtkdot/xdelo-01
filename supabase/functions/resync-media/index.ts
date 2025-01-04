import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logToDatabase = async (supabase, functionName: string, status: 'info' | 'error' | 'success', message: string) => {
  try {
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: functionName,
        status,
        message
      });
  } catch (error) {
    console.error('Error logging to database:', error);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { mediaIds } = await req.json();
    await logToDatabase(supabaseClient, 'resync-media', 'info', `Starting media resync for IDs: ${mediaIds.join(', ')}`);

    // Get media items to process
    const { data: mediaItems, error: fetchError } = await supabaseClient
      .from('media')
      .select('*')
      .in('id', mediaIds);

    if (fetchError) {
      throw fetchError;
    }

    await logToDatabase(supabaseClient, 'resync-media', 'info', `Found ${mediaItems?.length || 0} media items to process`);

    const updates = [];
    const errors = [];

    // Process media items
    for (const item of mediaItems || []) {
      try {
        // Check if the file exists in storage
        if (item.file_name) {
          const { data: fileExists } = await supabaseClient
            .storage
            .from('telegram-media')
            .list('', {
              limit: 1,
              offset: 0,
              search: item.file_name
            });

          // Only proceed with URL updates if the file exists
          if (fileExists && fileExists.length > 0) {
            // Generate new public URL using the bucket's public URL
            const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${item.file_name}`;

            // Verify the file is accessible
            try {
              const response = await fetch(publicUrl);
              if (!response.ok) {
                throw new Error(`File not accessible: ${response.status}`);
              }

              // Update media record with new URLs
              const updateData = {
                id: item.id,
                public_url: publicUrl,
                file_url: publicUrl,
                updated_at: new Date().toISOString()
              };

              const { error: updateError } = await supabaseClient
                .from('media')
                .update(updateData)
                .eq('id', item.id);

              if (updateError) {
                await logToDatabase(supabaseClient, 'resync-media', 'error', `Error updating media item ${item.id}: ${updateError.message}`);
                throw updateError;
              }

              await logToDatabase(supabaseClient, 'resync-media', 'success', `Successfully processed media item: ${item.id} with new URL: ${publicUrl}`);
              updates.push(updateData);
            } catch (error) {
              await logToDatabase(supabaseClient, 'resync-media', 'error', `Error verifying file accessibility for ${item.id}: ${error.message}`);
              errors.push({ id: item.id, error: error.message });
            }
          } else {
            await logToDatabase(supabaseClient, 'resync-media', 'error', `File not found in storage: ${item.file_name}`);
            errors.push({ id: item.id, error: 'File not found in storage' });
          }
        } else {
          await logToDatabase(supabaseClient, 'resync-media', 'error', `No file name for media item: ${item.id}`);
          errors.push({ id: item.id, error: 'No file name' });
        }
      } catch (error) {
        console.error(`Error processing media item ${item.id}:`, error);
        errors.push({ id: item.id, error: error.message });
        await logToDatabase(supabaseClient, 'resync-media', 'error', `Error processing media item ${item.id}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully resynced ${updates.length} media items`,
        updatedCount: updates.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errors.length > 0 ? 207 : 200,
      }
    );

  } catch (error) {
    console.error('Error in resync-media function:', error);
    await logToDatabase(supabaseClient, 'resync-media', 'error', `Error in resync-media function: ${error.message}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});