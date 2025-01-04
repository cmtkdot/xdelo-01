import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

interface SyncChannelButtonProps {
  channelIds: number[];
  onComplete?: () => void;
}

export const SyncChannelButton = ({ channelIds, onComplete }: SyncChannelButtonProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    if (!channelIds.length) {
      toast({
        title: "No channels selected",
        description: "Please select at least one channel to sync",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-telegram-channel', {
        body: { channelIds }
      });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: `Processed ${data.processed} media items${data.errors > 0 ? ` with ${data.errors} errors` : ''}`,
        variant: data.errors > 0 ? "destructive" : "default",
      });

      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error syncing channels:', error);
      toast({
        title: "Error",
        description: "Failed to sync channels. Please try again.",
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
      className="gap-2"
    >
      {isSyncing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Sync Channel
    </Button>
  );
};