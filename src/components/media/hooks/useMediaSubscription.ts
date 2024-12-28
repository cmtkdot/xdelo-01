import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { syncWithGoogleSheets } from "../utils/googleSheetsSync";
import { MediaItem } from "../types";

const useMediaSubscription = (spreadsheetId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    console.log("Setting up realtime subscription");
    const channel = supabase
      .channel('media_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'media' 
      }, async (payload) => {
        console.log('Media change received:', payload);
        
        await queryClient.invalidateQueries({ queryKey: ['media-table'] });
        
        const mediaData = queryClient.getQueryData(['media-table']) as MediaItem[];
        
        if (spreadsheetId && mediaData) {
          try {
            await syncWithGoogleSheets(spreadsheetId, mediaData);
            console.log('Successfully synced with Google Sheets');
          } catch (error) {
            console.error('Failed to sync with Google Sheets:', error);
            toast({
              title: "Sync Error",
              description: "Failed to sync changes with Google Sheets",
              variant: "destructive",
            });
          }
        }

        const eventMessages = {
          INSERT: 'New media file added',
          UPDATE: 'Media file updated',
          DELETE: 'Media file removed'
        };

        toast({
          title: eventMessages[payload.eventType as keyof typeof eventMessages] || 'Media changed',
          description: `The media gallery has been updated`,
          variant: "default",
        });
      })
      .subscribe();

    return () => {
      console.log("Cleaning up subscription");
      channel.unsubscribe();
    };
  }, [queryClient, toast, spreadsheetId]);
};

export default useMediaSubscription;