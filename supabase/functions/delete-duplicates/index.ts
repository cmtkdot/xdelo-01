import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Get all media items grouped by their Telegram file ID
    const { data: mediaGroups, error: fetchError } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: !keepNewest });

    if (fetchError) throw fetchError;

    // Group media by Telegram file ID
    const groupedMedia = mediaGroups.reduce((acc: any, item: any) => {
      const fileId = item.metadata?.telegram_file_id;
      if (!fileId) return acc;
      
      if (!acc[fileId]) {
        acc[fileId] = [];
      }
      acc[fileId].push(item);
      return acc;
    }, {});

    let deletedCount = 0;
    const duplicatesFound = Object.values(groupedMedia).filter((group: any) => group.length > 1);
    
    console.log(`Found ${duplicatesFound.length} groups with duplicates`);

    // Process each group of duplicates
    for (const group of duplicatesFound) {
      const [keep, ...duplicates] = group as any[];
      
      if (duplicates.length > 0) {
        const { error: deleteError } = await supabase
          .from('media')
          .delete()
          .in('id', duplicates.map((d: any) => d.id));

        if (deleteError) {
          console.error('Error deleting duplicates:', deleteError);
          continue;
        }

        deletedCount += duplicates.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully deleted ${deletedCount} duplicate files`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});