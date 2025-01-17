import { ExternalLink, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ResyncButton } from "./actions/ResyncButton";
import { DriveUploadButton } from "./actions/DriveUploadButton";

interface MediaTableActionsProps {
  id: string;
  fileUrl: string;
  fileName: string;
  chatId: number | null;
  messageId?: number | null;
  onView: () => void;
  hasGoogleDrive: boolean;
  onDelete: () => void;
  onUpdate?: () => void;
}

export const MediaTableActions = ({ 
  id,
  fileUrl, 
  fileName,
  chatId,
  messageId,
  onView, 
  hasGoogleDrive,
  onDelete,
  onUpdate
}: MediaTableActionsProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      // First, delete from storage bucket
      const { error: storageError } = await supabase
        .storage
        .from('media')
        .remove([fileName]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
        // as the file might have been already deleted or moved
      }

      // Then delete the associated message if it exists
      if (chatId && messageId) {
        const { error: messageError } = await supabase
          .from('messages')
          .delete()
          .eq('chat_id', chatId)
          .eq('message_id', messageId);

        if (messageError) {
          console.error('Error deleting message:', messageError);
          // Continue with media deletion even if message deletion fails
        }
      }

      // Finally delete the media entry
      const { error: mediaError } = await supabase
        .from('media')
        .delete()
        .eq('id', id);

      if (mediaError) throw mediaError;

      toast({
        title: "Success",
        description: "Media and associated data deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      onDelete();
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete media. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="text-right space-x-2 whitespace-nowrap">
      <ResyncButton id={id} onUpdate={onUpdate} />

      <DriveUploadButton
        fileUrl={fileUrl}
        fileName={fileName}
        hasGoogleDrive={hasGoogleDrive}
        onUpdate={onUpdate}
      />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onView}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:text-sky-300 transition-all duration-200 font-medium"
            >
              View <ExternalLink className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Open file in new tab</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogTrigger asChild>
          <button
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200 font-medium"
          >
            Delete <Trash2 className="w-4 h-4" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this media and its associated data? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};