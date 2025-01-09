import { Image, Trash2, RefreshCw, RotateCw, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface MediaGalleryHeaderProps {
  onSyncCaptions: () => Promise<void>;
  onDeleteDuplicates: () => Promise<void>;
  isSyncingCaptions: boolean;
  isDeletingDuplicates: boolean;
}

const MediaGalleryHeader = ({
  onSyncCaptions,
  onDeleteDuplicates,
  isSyncingCaptions,
  isDeletingDuplicates,
}: MediaGalleryHeaderProps) => {
  const [isResyncing, setResyncing] = useState(false);
  const [isSyncingGroups, setSyncingGroups] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleResync = async () => {
    try {
      setResyncing(true);
      const { error } = await supabase.functions.invoke('resync-media', {
        body: { action: "resync" },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['media-table'] });
      
      toast({
        title: "Success",
        description: "Media files resynced successfully",
      });
    } catch (error) {
      console.error('Error resyncing media:', error);
      toast({
        title: "Error",
        description: "Failed to resync media files",
        variant: "destructive",
      });
    } finally {
      setResyncing(false);
    }
  };

  const handleSyncMediaGroups = async () => {
    try {
      setSyncingGroups(true);
      console.log('Starting media groups sync...');
      
      const { error } = await supabase.functions.invoke('sync-media-captions', {
        body: { action: "sync_groups" },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      // Force a refetch of all media data
      await queryClient.invalidateQueries({ queryKey: ['media'] });
      await queryClient.invalidateQueries({ queryKey: ['media-table'] });

      toast({
        title: "Success",
        description: "Media group captions synchronized successfully",
      });
    } catch (error) {
      console.error('Error syncing media groups:', error);
      toast({
        title: "Error",
        description: "Failed to sync media group captions",
        variant: "destructive",
      });
    } finally {
      setSyncingGroups(false);
    }
  };

  return (
    <div className="w-full backdrop-blur-xl bg-black/40 border border-white/10 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-5 h-5 text-[#0088cc]" />
          <h2 className="text-lg font-semibold text-white">Media Gallery</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResync}
            disabled={isResyncing}
            className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5"
            title="Resync media files"
          >
            <RotateCw className={`w-4 h-4 mr-2 ${isResyncing ? 'animate-spin' : ''}`} />
            Resync Media
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncMediaGroups}
            disabled={isSyncingGroups}
            className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5"
            title="Sync captions within media groups"
          >
            <Users className={`w-4 h-4 mr-2 ${isSyncingGroups ? 'animate-spin' : ''}`} />
            Sync Group Captions
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onSyncCaptions}
            disabled={isSyncingCaptions}
            className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5"
            title="Sync captions across media groups"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncingCaptions ? 'animate-spin' : ''}`} />
            Sync All Captions
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteDuplicates}
            disabled={isDeletingDuplicates}
            className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5"
            title="Delete duplicate media files"
          >
            <Trash2 className={`w-4 h-4 mr-2 ${isDeletingDuplicates ? 'animate-spin' : ''}`} />
            Delete Duplicates
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MediaGalleryHeader;