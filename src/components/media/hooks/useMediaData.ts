import { supabase } from "@/integrations/supabase/client";
import { MediaItem, MediaFilter } from "../types";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";

const useMediaData = (filter: MediaFilter) => {
  const { toast } = useToast();
  
  const query = useQuery({
    queryKey: ['media', filter],
    queryFn: async () => {
      console.log("Fetching media with filter:", filter);
      let query = supabase
        .from('media')
        .select(`
          *,
          chat:channels(title, username)
        `)
        .order('created_at', { ascending: false });

      if (filter.selectedChannel !== "all") {
        query = query.eq('chat_id', parseInt(filter.selectedChannel));
      }
      
      if (filter.selectedType !== "all") {
        query = query.eq('media_type', filter.selectedType);
      }

      if (filter.uploadStatus === "not_uploaded") {
        query = query.is('google_drive_id', null);
      } else if (filter.uploadStatus === "uploaded") {
        query = query.not('google_drive_id', 'is', null);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching media:', error);
        toast({
          title: "Error",
          description: "Failed to load media gallery",
          variant: "destructive",
        });
        throw error;
      }

      console.log("Media data fetched:", data?.length, "items");
      return data as MediaItem[];
    },
  });

  return query;
};

export default useMediaData;