import React, { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { RefreshCw, AlertCircle } from "lucide-react";

interface SyncManagerProps {
  channelId: string;
}

export const SyncManager: React.FC<SyncManagerProps> = ({ channelId }) => {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const supabase = useSupabaseClient();

  useEffect(() => {
    // Get channel info
    const getChannelInfo = async () => {
      const { data } = await supabase
        .from('telegram_channels')
        .select('last_sync_at')
        .eq('id', channelId)
        .single();

      if (data) {
        setLastSync(data.last_sync_at);
      }
    };

    getChannelInfo();

    // Subscribe to sync log updates
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
          if (payload.new) {
            setProgress(payload.new.progress || 0);
            
            if (payload.new.status === 'completed') {
              setSyncing(false);
              toast.success('Sync completed successfully');
              setLastSync(payload.new.completed_at);
            } else if (payload.new.status === 'failed') {
              setSyncing(false);
              toast.error(`Sync failed: ${payload.new.error_message}`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, supabase]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setProgress(0);

      const { error } = await supabase.functions.invoke('telegram-channels', {
        body: { action: 'sync', channel_id: channelId, sync_type: 'full' }
      });

      if (error) throw error;

    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to start sync');
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Channel Sync</span>
          {lastSync && (
            <span className="text-sm text-gray-500">
              Last sync: {new Date(lastSync).toLocaleString()}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {syncing ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Syncing media...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        ) : (
          <Button
            onClick={handleSync}
            className="w-full"
            disabled={syncing}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Channel
          </Button>
        )}
      </CardContent>
    </Card>
  );
};