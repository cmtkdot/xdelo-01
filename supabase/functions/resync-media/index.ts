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
        // Only attempt to delete if the file exists
        if (item.file_name) {
          const { data: fileExists } = await supabaseClient
            .storage
            .from('telegram-media')
            .list('', {
              limit: 1,
              offset: 0,
              search: item.file_name
            });

          if (fileExists && fileExists.length > 0) {
            await logToDatabase(supabaseClient, 'resync-media', 'info', `Attempting to delete file: ${item.file_name}`);
            
            const { error: deleteError } = await supabaseClient
              .storage
              .from('telegram-media')
              .remove([item.file_name]);

            if (deleteError) {
              await logToDatabase(supabaseClient, 'resync-media', 'error', `Error deleting file ${item.file_name}: ${deleteError.message}`);
              console.error(`Error deleting file ${item.file_name}:`, deleteError);
            } else {
              await logToDatabase(supabaseClient, 'resync-media', 'success', `Successfully deleted file: ${item.file_name}`);
            }
          }
        }

        // Generate new public URL using the bucket's public URL
        const publicUrl = item.file_name 
          ? `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${item.file_name}`
          : null;

        // Update media record with new URLs
        const updateData = {
          id: item.id,
          public_url: publicUrl,
          file_url: publicUrl, // Use the same public URL for file_url
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