import { useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MediaItem } from "../types";
import { syncWithGoogleSheets } from "../utils/googleSheetsSync";
import { SYNC_INTERVAL } from './constants';
import { SpreadsheetConfig } from './types';

interface SyncManagerProps {
  spreadsheets: SpreadsheetConfig[];
  allMedia: MediaItem[] | undefined;
}

export const SyncManager = ({ spreadsheets, allMedia }: SyncManagerProps) => {
  const { toast } = useToast();

  useEffect(() => {
    // Initial sync for each configured spreadsheet
    const performInitialSync = async () => {
      for (const sheet of spreadsheets) {
        if (sheet.autoSync && sheet.isHeadersMapped && allMedia) {
          try {
            await syncWithGoogleSheets(sheet.id, allMedia, sheet.gid);
            console.log(`Initial sync completed for spreadsheet: ${sheet.id}`);
          } catch (error) {
            console.error(`Initial sync failed for spreadsheet: ${sheet.id}`, error);
          }
        }
      }
    };

    if (allMedia?.length) {
      performInitialSync();
    }

    // Set up interval for automatic syncing
    const syncInterval = setInterval(() => {
      spreadsheets.forEach(sheet => {
        if (sheet.autoSync && sheet.isHeadersMapped && allMedia) {
          performSync(sheet.id, allMedia, sheet.gid);
        }
      });
    }, SYNC_INTERVAL);

    // Set up real-time subscription for media changes
    const channels = spreadsheets
      .filter(sheet => sheet.autoSync && sheet.isHeadersMapped)
      .map(sheet => {
        return supabase
          .channel(`media_changes_${sheet.id}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'media' 
          }, async () => {
            if (allMedia) {
              await performSync(sheet.id, allMedia, sheet.gid);
            }
          })
          .subscribe();
      });

    return () => {
      clearInterval(syncInterval);
      channels.forEach(channel => channel.unsubscribe());
    };
  }, [spreadsheets, allMedia]);

  const performSync = async (spreadsheetId: string, mediaItems: MediaItem[], gid?: string) => {
    try {
      await syncWithGoogleSheets(spreadsheetId, mediaItems, gid);
      console.log(`Synced with spreadsheet: ${spreadsheetId}${gid ? ` (GID: ${gid})` : ''}`);
      toast({
        title: "Sync Successful",
        description: "Media data has been synchronized with Google Sheets",
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync with Google Sheets",
        variant: "destructive",
      });
    }
  };

  return null;
};