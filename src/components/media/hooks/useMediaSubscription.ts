import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MediaItem } from "../types";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { syncWithGoogleSheets } from "../utils/googleSheetsSync";

const useMediaSubscription = (spreadsheetId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel('media_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media'
        },
        async (payload) => {
          console.log('Received real-time update:', payload);
          
          // Invalidate and refetch media data
          await queryClient.invalidateQueries({ queryKey: ['media'] });
          
          // If spreadsheetId is provided, sync with Google Sheets
          if (spreadsheetId) {
            try {
              await syncWithGoogleSheets(spreadsheetId);
              console.log('Synced with Google Sheets after media update');
            } catch (error) {
              console.error('Error syncing with Google Sheets:', error);
              toast({
                title: "Sync Error",
                description: "Failed to sync with Google Sheets",
                variant: "destructive",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, spreadsheetId, toast]);
};

export default useMediaSubscription;