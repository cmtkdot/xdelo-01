import { Image, Trash2, RefreshCw, RotateCw, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

      toast({
        title: "Success",
        description: "Media resynced successfully",
      });
    } catch (error) {
      console.error('Error resyncing media:', error);
      toast({
        title: "Error",
        description: "Failed to resync media",
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
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 backdrop-blur-xl bg-black/40 border border-white/10 p-4 rounded-lg">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-md bg-[#0088cc]/10 text-[#0088cc]">
          <Image className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Media Gallery</h2>
          <p className="text-sm text-gray-500">Manage your media files</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleResync}
          disabled={isResyncing}
          className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5"
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
          title="Delete duplicates based on Telegram file IDs"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete File Duplicates
        </Button>
      </div>
    </div>
  );
};

export default MediaGalleryHeader;