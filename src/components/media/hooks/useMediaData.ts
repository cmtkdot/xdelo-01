import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MediaFilter } from "../types";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const useMediaData = (filter?: MediaFilter) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);
  
  return useQuery({
    queryKey: ['media', filter],
    queryFn: async () => {
      console.log("Fetching media with filter:", filter);
      
      try {
        // Get current session to ensure we're authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        let query = supabase
          .from('media')
          .select(`
            *,
            chat:channels(title, username)
          `)
          .order('created_at', { ascending: false });

        // Apply filters if provided
        if (filter?.selectedChannel !== "all") {
          query = query.eq('chat_id', parseInt(filter.selectedChannel));
        }
        
        if (filter?.selectedType !== "all") {
          query = query.eq('media_type', filter.selectedType);
        }

        if (filter?.uploadStatus === "not_uploaded") {
          query = query.is('google_drive_id', null);
        } else if (filter?.uploadStatus === "uploaded") {
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
        return data || [];
      } catch (error: any) {
        console.error('Error fetching media:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to load media gallery",
          variant: "destructive",
        });
        throw error;
      }
    },
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 1000, // Poll every second for updates
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};