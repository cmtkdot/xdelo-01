import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logToDatabase = async (supabase: any, functionName: string, status: 'info' | 'error' | 'success', message: string) => {
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
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
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
        if (!item.file_name) {
          await logToDatabase(supabaseClient, 'resync-media', 'error', `No file name for media item: ${item.id}`);
          errors.push({ id: item.id, error: 'No file name' });
          continue;
        }

        // Check if file exists in storage
        const { data: fileExists } = await supabaseClient
          .storage
          .from('telegram-media')
          .list('', {
            limit: 1,
            offset: 0,
            search: item.file_name
          });

        // If file doesn't exist, try to recreate it using the original file name
        if (!fileExists || fileExists.length === 0) {
          // Extract original file name from metadata if available
          const originalFileName = typeof item.metadata === 'object' && item.metadata !== null
            ? (item.metadata as Record<string, any>).file_name || item.file_name
            : item.file_name;

          await logToDatabase(
            supabaseClient, 
            'resync-media', 
            'info', 
            `File not found, attempting to recreate with original name: ${originalFileName}`
          );

          // Generate new file name while preserving extension
          const fileExt = originalFileName.split('.').pop()?.toLowerCase() || '';
          const timestamp = Date.now();
          const newFileName = `${originalFileName.split('.')[0]}_${timestamp}.${fileExt}`;

          // Try to fetch the original file content
          try {
            const response = await fetch(item.file_url);
            if (!response.ok) {
              throw new Error(`Failed to fetch original file: ${response.status}`);
            }

            const fileContent = await response.arrayBuffer();
            const contentType = response.headers.get('content-type') || 'application/octet-stream';

            // Upload the file with the new name
            const { error: uploadError } = await supabaseClient
              .storage
              .from('telegram-media')
              .upload(newFileName, fileContent, {
                contentType,
                upsert: false
              });

            if (uploadError) {
              throw uploadError;
            }

            // Generate new public URL
            const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${newFileName}`;

            // Update media record with new file name and URLs
            const updateData = {
              id: item.id,
              file_name: newFileName,
              public_url: publicUrl,
              file_url: publicUrl,
              updated_at: new Date().toISOString()
            };

            const { error: updateError } = await supabaseClient
              .from('media')
              .update(updateData)
              .eq('id', item.id);

            if (updateError) {
              throw updateError;
            }

            await logToDatabase(
              supabaseClient,
              'resync-media',
              'success',
              `Successfully recreated and updated media item: ${item.id} with new file: ${newFileName}`
            );
            updates.push(updateData);

          } catch (error) {
            await logToDatabase(
              supabaseClient,
              'resync-media',
              'error',
              `Failed to recreate file for ${item.id}: ${error.message}`
            );
            errors.push({ id: item.id, error: error.message });
          }
        } else {
          // File exists, just update the URLs
          const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/telegram-media/${item.file_name}`;
          
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
            throw updateError;
          }

          await logToDatabase(
            supabaseClient,
            'resync-media',
            'success',
            `Successfully updated existing media item: ${item.id}`
          );
          updates.push(updateData);
        }
      } catch (error) {
        console.error(`Error processing media item ${item.id}:`, error);
        errors.push({ id: item.id, error: error.message });
        await logToDatabase(
          supabaseClient,
          'resync-media',
          'error',
          `Error processing media item ${item.id}: ${error.message}`
        );
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
    await logToDatabase(
      supabaseClient,
      'resync-media',
      'error',
      `Error in resync-media function: ${error.message}`
    );
    
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