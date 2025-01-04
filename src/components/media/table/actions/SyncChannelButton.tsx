import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SyncChannelButtonProps {
  channelIds: number[];
  onComplete?: () => void;
}

export function SyncChannelButton({ channelIds, onComplete }: SyncChannelButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    if (channelIds.length === 0) {
      toast({
        title: "No channels selected",
        description: "Please select at least one channel to sync",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSyncing(true);

      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'sync-telegram-channel',
          status: 'info',
          message: `Starting sync for channels: ${channelIds.join(', ')}`
        });

      const { data, error } = await supabase.functions.invoke('sync-telegram-channel', {
        body: { chatIds: channelIds }
      });

      if (error) throw error;

      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'sync-telegram-channel',
          status: 'success',
          message: `Successfully synced channels: ${channelIds.join(', ')}`
        });

      toast({
        title: "Sync Complete",
        description: `Successfully synced ${data?.processed || 0} media items${data?.errors > 0 ? ` with ${data.errors} errors` : ''}`,
        variant: data?.errors > 0 ? "destructive" : "default",
      });

      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error syncing channel:', error);

      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'sync-telegram-channel',
          status: 'error',
          message: `Error syncing channels: ${error.message}`
        });

      toast({
        title: "Error",
        description: "Failed to sync channel",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      size="sm"
      className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5"
    >
      {isSyncing ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      Sync Channel
    </Button>
  );
}