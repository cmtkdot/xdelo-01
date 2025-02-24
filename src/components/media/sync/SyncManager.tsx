import React, { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { SyncLog } from "../types";

interface SyncManagerProps {
  channelId: string;
}

export const SyncManager: React.FC<SyncManagerProps> = ({ channelId }) => {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const supabase = useSupabaseClient();

  useEffect(() => {
    const getChannelInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('telegram_channels')
          .select('last_sync_at')
          .eq('id', channelId)
          .single();

        if (error) {
          console.error('Error fetching channel info:', error);
          return;
        }

        if (data) {
          setLastSync(data.last_sync_at);
        }
      } catch (error) {
        console.error('Error in getChannelInfo:', error);
      }
    };

    getChannelInfo();

    // Subscribe to sync progress updates
    const channel = supabase.channel('sync_progress')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'sync_logs',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          if (!payload.new || typeof payload.new !== 'object') {
            console.error('Invalid payload received:', payload);
            return;
          }

          const syncStatus = payload.new as SyncLog;
          setProgress(syncStatus.progress || 0);
            
          if (syncStatus.status === 'completed') {
            setSyncing(false);
            toast.success('Sync completed successfully');
            setLastSync(syncStatus.completed_at || null);
          } else if (syncStatus.status === 'failed') {
            setSyncing(false);
            toast.error(`Sync failed: ${syncStatus.error_message}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, supabase]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Channel Sync Status</span>
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
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {lastSync ? `Last synced: ${new Date(lastSync).toLocaleString()}` : 'Never synced'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};