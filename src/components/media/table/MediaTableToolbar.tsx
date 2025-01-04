import { Trash2, Upload, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MediaItem } from "../types";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import GoogleDriveUploader from "../GoogleDriveUploader";

interface MediaTableToolbarProps {
  selectedMedia: MediaItem[];
  onDeleteSuccess: () => void;
}

export const MediaTableToolbar = ({ selectedMedia, onDeleteSuccess }: MediaTableToolbarProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const { toast } = useToast();

  const handleBulkDelete = async () => {
    try {
      // Delete associated messages if chatId and messageId exist
      for (const item of selectedMedia) {
        // Ensure metadata is a Record before accessing message_id
        const messageId = typeof item.metadata === 'object' && item.metadata !== null
          ? (item.metadata as Record<string, any>).message_id
          : undefined;

        if (item.chat_id && messageId) {
          const { error: messageError } = await supabase
            .from('messages')
            .delete()
            .eq('chat_id', item.chat_id)
            .eq('message_id', messageId);

          if (messageError) {
            console.error('Error deleting message:', messageError);
            // Continue with media deletion even if message deletion fails
          }
        }
      }

      // Delete selected media items
      const { error: mediaError } = await supabase
        .from('media')
        .delete()
        .in('id', selectedMedia.map(item => item.id));

      if (mediaError) throw mediaError;

      toast({
        title: "Success",
        description: `Successfully deleted ${selectedMedia.length} item${selectedMedia.length !== 1 ? 's' : ''}`,
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

  const handleBulkResync = async () => {
    try {
      setIsResyncing(true);
      console.log('Resyncing media IDs:', selectedMedia.map(item => item.id));
      
      const { data, error } = await supabase.functions.invoke('resync-media', {
        body: { 
          mediaIds: selectedMedia.map(item => item.id)
        }
      });

      if (error) throw error;

      if (data.errors?.length > 0) {
        console.warn('Some items failed to resync:', data.errors);
        toast({
          title: "Partial Success",
          description: `Resynced ${data.updatedCount} items, but ${data.errors.length} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Successfully resynced ${data.updatedCount} item${data.updatedCount !== 1 ? 's' : ''}`,
        });
      }
      
      onDeleteSuccess(); // Refresh the list
    } catch (error) {
      console.error('Error resyncing media:', error);
      toast({
        title: "Error",
        description: "Failed to resync media items",
        variant: "destructive",
      });
    } finally {
      setIsResyncing(false);
    }
  };

  if (selectedMedia.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-sm text-white/70">
        {selectedMedia.length} item{selectedMedia.length !== 1 ? 's' : ''} selected
      </span>

      <Button
        variant="ghost"
        className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 hover:text-purple-300"
        onClick={handleBulkResync}
        disabled={isResyncing}
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isResyncing ? 'animate-spin' : ''}`} />
        Resync Selected
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Selected to Drive
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload to Google Drive</DialogTitle>
          </DialogHeader>
          <GoogleDriveUploader
            selectedFiles={selectedMedia}
            onSuccess={onDeleteSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedMedia.length} selected item{selectedMedia.length !== 1 ? 's' : ''}? This action cannot be undone.
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
    </div>
  );
};