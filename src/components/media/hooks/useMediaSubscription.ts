import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MediaItem } from "../types";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { syncWithGoogleSheets, initGoogleSheetsAPI } from "../utils/googleSheetsSync";

const useMediaSubscription = (spreadsheetId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isGoogleSheetsReady, setIsGoogleSheetsReady] = useState(false);

  // Initialize Google Sheets API
  useEffect(() => {
    if (spreadsheetId) {
      initGoogleSheetsAPI()
        .then(() => setIsGoogleSheetsReady(true))
        .catch((error) => {
          console.error('Failed to initialize Google Sheets:', error);
          toast({
            title: "Google Sheets Error",
            description: "Failed to initialize Google Sheets integration",
            variant: "destructive",
          });
        });
    }
  }, [spreadsheetId, toast]);

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
        
        // Invalidate and refetch the media-table query
        const updatedData = await queryClient.invalidateQueries({ queryKey: ['media-table'] });
        
        // If Google Sheets is configured, sync the data
        if (spreadsheetId && isGoogleSheetsReady && updatedData) {
          try {
            await syncWithGoogleSheets(spreadsheetId, updatedData as MediaItem[]);
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

        // Show a toast notification based on the event type
        const eventMessages = {
          INSERT: 'New media file added',
          UPDATE: 'Media file updated',
          DELETE: 'Media file removed'
        };

        toast({
          title: eventMessages[payload.eventType] || 'Media changed',
          description: `The media gallery has been updated`,
          variant: "default",
        });
      })
      .subscribe();

    return () => {
      console.log("Cleaning up subscription");
      channel.unsubscribe();
    };
  }, [queryClient, toast, spreadsheetId, isGoogleSheetsReady]);
};

export default useMediaSubscription;