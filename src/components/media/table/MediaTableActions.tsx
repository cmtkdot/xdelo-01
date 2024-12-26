import { ExternalLink, Upload, Check, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import GoogleDriveUploader from "../GoogleDriveUploader";

interface MediaTableActionsProps {
  id: string;
  fileUrl: string;
  fileName: string;
  onView: () => void;
  hasGoogleDrive: boolean;
  onDelete: () => void;
}

export const MediaTableActions = ({ 
  id,
  fileUrl, 
  fileName, 
  onView, 
  hasGoogleDrive,
  onDelete
}: MediaTableActionsProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('media')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Media deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      onDelete();
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: "Error",
        description: "Failed to delete media",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="text-right space-x-2 whitespace-nowrap">
      {!hasGoogleDrive ? (
        <Dialog>
          <DialogTrigger asChild>
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300 transition-all duration-200 font-medium"
            >
              Drive <Upload className="w-4 h-4" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload to Google Drive</DialogTitle>
            </DialogHeader>
            <GoogleDriveUploader
              fileUrl={fileUrl}
              fileName={fileName}
            />
          </DialogContent>
        </Dialog>
      ) : (
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/20 text-green-400 cursor-default"
          disabled
        >
          Uploaded <Check className="w-4 h-4" />
        </button>
      )}

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
              Are you sure you want to delete this media? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};