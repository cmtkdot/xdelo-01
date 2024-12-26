import { Button } from "@/components/ui/button";
import { Trash2, Upload, RefreshCw } from "lucide-react";
import { MediaItem } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MediaTableToolbarProps {
  selectedMedia: MediaItem[];
  onDeleteSuccess: () => void;
}

export const MediaTableToolbar = ({ selectedMedia, onDeleteSuccess }: MediaTableToolbarProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSyncingCaptions, setSyncingCaptions] = useState(false);
  const [isDeletingDuplicates, setDeletingDuplicates] = useState(false);
  const { toast } = useToast();

  const handleDeleteSelected = async () => {
    try {
      const { error } = await supabase
        .from('media')
        .delete()
        .in('id', selectedMedia.map(item => item.id));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully deleted ${selectedMedia.length} media items`,
      });

      onDeleteSuccess();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: "Error",
        description: "Failed to delete media items",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDuplicates = async () => {
    try {
      setDeletingDuplicates(true);
      const { error } = await supabase.functions.invoke('delete-duplicates', {
        body: { keepNewest: true }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Duplicate media files have been cleaned up",
      });

      onDeleteSuccess();
    } catch (error) {
      console.error('Error deleting duplicates:', error);
      toast({
        title: "Error",
        description: "Failed to delete duplicate media files",
        variant: "destructive",
      });
    } finally {
      setDeletingDuplicates(false);
    }
  };

  const handleSyncCaptions = async () => {
    try {
      setSyncingCaptions(true);
      const { error } = await supabase.functions.invoke('sync-media-captions');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Media captions have been synchronized",
      });

      onDeleteSuccess();
    } catch (error) {
      console.error('Error syncing captions:', error);
      toast({
        title: "Error",
        description: "Failed to sync media captions",
        variant: "destructive",
      });
    } finally {
      setSyncingCaptions(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-2">
        {selectedMedia.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-xs"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected ({selectedMedia.length})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncCaptions}
          disabled={isSyncingCaptions}
          className="text-xs"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncingCaptions ? 'animate-spin' : ''}`} />
          Sync Captions
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteDuplicates}
          disabled={isDeletingDuplicates}
          className="text-xs"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Duplicates
        </Button>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Media</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedMedia.length} selected media items? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};