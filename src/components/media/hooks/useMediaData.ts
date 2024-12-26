import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MediaItem, MediaFilter } from "../types";
import { useToast } from "@/components/ui/use-toast";

const useMediaData = (filter: MediaFilter) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMedia();
  }, [filter.selectedChannel, filter.selectedType, filter.uploadStatus]);

  const fetchMedia = async () => {
    try {
      console.log("Fetching media with filter:", filter);
      setIsLoading(true);
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
      
      if (error) throw error;
      
      console.log("Fetched media data:", data);
      setMedia(data as MediaItem[]);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast({
        title: "Error",
        description: "Failed to load media gallery",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { data: media, isLoading };
};

export default useMediaData;