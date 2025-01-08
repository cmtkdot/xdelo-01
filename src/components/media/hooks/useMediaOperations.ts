import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useMediaOperations = (refetch: () => void) => {
  const [isDeletingDuplicates, setDeletingDuplicates] = useState(false);
  const [isSyncingCaptions, setSyncingCaptions] = useState(false);
  const { toast } = useToast();

  const handleSyncCaptions = async () => {
    try {
      setSyncingCaptions(true);
      
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('chat_id')
        .eq('is_active', true);

      if (channelsError) throw channelsError;

      if (!channelsData || channelsData.length === 0) {
        toast({
          title: "No channels found",
          description: "Please add some channels first",
          variant: "destructive",
        });
        return;
      }

      const chatIds = channelsData.map(channel => channel.chat_id);
      console.log('Syncing captions for channels:', chatIds);

      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'sync-media-captions',
          status: 'info',
          message: `Starting caption sync for channels: ${chatIds.join(', ')}`
        });

      const { data, error } = await supabase.functions.invoke('sync-media-captions', {
        body: { chatIds },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      if (data?.errors?.length > 0) {
        console.warn('Some errors occurred during sync:', data.errors);
        toast({
          title: "Partial Success",
          description: `Synced ${data.processed} items with ${data.errors.length} errors`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Successfully synced ${data?.processed || 0} media captions`,
        });
      }

      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'sync-media-captions',
          status: 'success',
          message: 'Successfully synchronized media captions'
        });

      refetch();
    } catch (error) {
      console.error('Error syncing captions:', error);

      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'sync-media-captions',
          status: 'error',
          message: `Error syncing captions: ${error.message}`
        });

      toast({
        title: "Error",
        description: "Failed to sync media captions",
        variant: "destructive",
      });
    } finally {
      setSyncingCaptions(false);
    }
  };

  const handleDeleteDuplicates = async () => {
    try {
      setDeletingDuplicates(true);
      
      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'delete-duplicates',
          status: 'info',
          message: 'Starting duplicate media cleanup'
        });

      const { error } = await supabase.functions.invoke('delete-duplicates', {
        body: { keepNewest: true },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'delete-duplicates',
          status: 'success',
          message: 'Successfully cleaned up duplicate media files'
        });

      toast({
        title: "Success",
        description: "Duplicate media files have been cleaned up",
      });

      refetch();
    } catch (error) {
      console.error('Error deleting duplicates:', error);

      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'delete-duplicates',
          status: 'error',
          message: `Error cleaning up duplicates: ${error.message}`
        });

      toast({
        title: "Error",
        description: "Failed to delete duplicate media files",
        variant: "destructive",
      });
    } finally {
      setDeletingDuplicates(false);
    }
  };

  return {
    isDeletingDuplicates,
    isSyncingCaptions,
    handleDeleteDuplicates,
    handleSyncCaptions,
  };
};