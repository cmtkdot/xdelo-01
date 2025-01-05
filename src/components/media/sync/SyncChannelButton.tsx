import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SyncChannelDialog from './SyncChannelDialog';

interface SyncChannelButtonProps {
  channelId?: string;
  onComplete?: () => void;
}

const SyncChannelButton = ({ channelId, onComplete }: SyncChannelButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const { toast } = useToast();

  const handleSync = async () => {
    if (!channelId) {
      toast({
        title: "No channel selected",
        description: "Please select a channel to sync",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSyncing(true);
      setIsDialogOpen(true);
      setStatus('Starting sync...');
      setProgress(0);

      console.log('Starting sync for channel:', channelId);

      // Subscribe to sync progress updates
      const channel = supabase
        .channel('sync_progress')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'sync_logs',
            filter: `channel_id=eq.${channelId}`
          },
          (payload) => {
            const newData = payload.new as any;
            if (newData) {
              setProgress(newData.progress || 0);
              setStatus(newData.status || 'Processing...');
              
              if (newData.status === 'completed') {
                toast({
                  title: "Sync Complete",
                  description: "Channel media has been synchronized",
                });
                setTimeout(() => {
                  setIsDialogOpen(false);
                  if (onComplete) onComplete();
                }, 1500);
              } else if (newData.status === 'failed') {
                toast({
                  title: "Sync Failed",
                  description: newData.error_message || "An error occurred during sync",
                  variant: "destructive",
                });
              }
            }
          }
        )
        .subscribe();

      // Invoke the sync function
      const { error } = await supabase.functions.invoke('sync-telegram-channel', {
        body: { chatIds: [channelId] }
      });

      if (error) throw error;

    } catch (error) {
      console.error('Error syncing channel:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync channel",
        variant: "destructive",
      });
      setIsDialogOpen(false);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleSync}
        disabled={isSyncing}
        variant="outline"
        size="sm"
        className="text-xs bg-white/5 border-white/10 text-white/90 hover:bg-white/10"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : 'Sync Channel'}
      </Button>

      <SyncChannelDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        progress={progress}
        status={status}
        isLoading={isSyncing}
      />
    </>
  );
};

export default SyncChannelButton;