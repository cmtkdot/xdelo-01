import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MediaItem } from "../types";
import GoogleDriveUploader from "../GoogleDriveUploader";

interface MediaTableToolbarProps {
  selectedMedia: MediaItem[];
  onDeleteSuccess: () => void;
}

export const MediaTableToolbar = ({ 
  selectedMedia,
  onDeleteSuccess
}: MediaTableToolbarProps) => {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleBulkDelete = async () => {
    try {
      // Delete all selected items
      const { error } = await supabase
        .from('media')
        .delete()
        .in('id', selectedMedia.map(item => item.id));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedMedia.length} items deleted successfully`,
      });

      setIsDeleteDialogOpen(false);
      onDeleteSuccess();
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: "Error",
        description: "Failed to delete media items",
        variant: "destructive",
      });
    }
  };

  if (selectedMedia.length === 0) return null;

  return (
    <div className="flex justify-between items-center mb-4">
      <span className="text-white/70">
        {selectedMedia.length} item{selectedMedia.length !== 1 ? 's' : ''} selected
      </span>
      <div className="space-x-2">
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Selected Media</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedMedia.length} selected items? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <Button
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => setIsUploadDialogOpen(true)}
          >
            <Upload className="w-4 h-4" />
            Upload Selected to Drive
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Files to Google Drive</DialogTitle>
            </DialogHeader>
            <GoogleDriveUploader
              selectedFiles={selectedMedia}
              onSuccess={() => setIsUploadDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};