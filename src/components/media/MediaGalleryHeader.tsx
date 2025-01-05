import { Image, Trash2, RefreshCw, RotateCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MediaGalleryHeaderProps {
  onSyncCaptions: () => void;
  onDeleteDuplicates: () => void;
  isSyncingCaptions: boolean;
  isDeletingDuplicates: boolean;
}

const MediaGalleryHeader = ({
  onSyncCaptions,
  onDeleteDuplicates,
  isSyncingCaptions,
  isDeletingDuplicates
}: MediaGalleryHeaderProps) => {
  const { toast } = useToast();
  const [isResyncing, setResyncing] = useState(false);

  const handleResync = async () => {
    try {
      setResyncing(true);
      
      // Log the start of the operation
      console.log('Starting media resync operation...');
      
      const { data, error } = await supabase.functions.invoke('resync-media', {
        body: { mediaIds: [] }, // Empty array to resync all media
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Resync response:', data, error);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Media files have been resynced",
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

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Image className="w-6 h-6 text-blue-500 dark:text-[#0088cc]" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Media Gallery</h2>
      </div>
      
      <div className="flex items-center gap-2">
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
          onClick={onSyncCaptions}
          disabled={isSyncingCaptions}
          className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncingCaptions ? 'animate-spin' : ''}`} />
          Sync Captions
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onDeleteDuplicates}
          disabled={isDeletingDuplicates}
          className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Duplicates
        </Button>
      </div>
    </div>
  );
};

export default MediaGalleryHeader;