import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const useMediaSubscription = (refetch: () => void) => {
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
          await refetch();
          
          const eventMessages = {
            INSERT: 'New media file added',
            UPDATE: 'Media file updated',
            DELETE: 'Media file removed'
          };

          toast({
            title: eventMessages[payload.eventType as keyof typeof eventMessages] || 'Media changed',
            description: "The media gallery has been updated",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, toast]);
};

export default useMediaSubscription;