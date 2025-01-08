import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { keepNewest = true } = await req.json();
    console.log(`Starting duplicate cleanup, keeping ${keepNewest ? 'newest' : 'oldest'} versions`);

    // Get all media items that have a telegram_file_id in their metadata
    const { data: mediaItems, error: fetchError } = await supabase
      .from('media')
      .select('*')
      .not('metadata->telegram_file_id', 'is', null)
      .order('created_at', { ascending: !keepNewest });

    if (fetchError) throw fetchError;

    // Group media by Telegram file ID from metadata
    const groupedMedia = mediaItems.reduce((acc: Record<string, any[]>, item: any) => {
      const fileId = item.metadata?.telegram_file_id;
      if (!fileId) return acc;
      
      if (!acc[fileId]) {
        acc[fileId] = [];
      }
      acc[fileId].push(item);
      return acc;
    }, {});

    let deletedCount = 0;
    const duplicatesFound = Object.entries(groupedMedia).filter(([_, group]) => group.length > 1);
    
    console.log(`Found ${duplicatesFound.length} groups with duplicates`);

    // Process each group of duplicates
    for (const [fileId, group] of duplicatesFound) {
      const [keep, ...duplicates] = group;
      
      if (duplicates.length > 0) {
        // Log the duplicates being deleted
        console.log(`Deleting ${duplicates.length} duplicates for file ID: ${fileId}`);
        console.log('Keeping media item:', { id: keep.id, created_at: keep.created_at });
        
        const { error: deleteError } = await supabase
          .from('media')
          .delete()
          .in('id', duplicates.map(d => d.id));

        if (deleteError) {
          console.error(`Error deleting duplicates for file ID ${fileId}:`, deleteError);
          continue;
        }

        // Log successful deletion
        console.log(`Successfully deleted ${duplicates.length} duplicates for file ID: ${fileId}`);
        deletedCount += duplicates.length;
      }
    }

    // Log final results
    console.log(`Cleanup completed. Deleted ${deletedCount} duplicate files`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully deleted ${deletedCount} duplicate files`,
        duplicateGroupsFound: duplicatesFound.length,
        totalDeleted: deletedCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});