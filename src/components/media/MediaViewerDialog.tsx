import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MediaItem } from "./types";
import { X } from "lucide-react";

interface MediaViewerDialogProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const MediaViewerDialog = ({ item, isOpen, onClose }: MediaViewerDialogProps) => {
  if (!item) return null;

  const isVideo = item.media_type === "video";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] max-h-[80vh] p-0 bg-black/90 border-white/10">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50"
        >
          <X className="h-4 w-4 text-white" />
          <span className="sr-only">Close</span>
        </button>
        
        <div className="relative w-full h-full min-h-[200px] flex items-center justify-center p-4">
          {isVideo ? (
            <video
              src={item.file_url}
              className="max-w-full max-h-[70vh] rounded-lg"
              controls
              autoPlay
            />
          ) : (
            <img
              src={item.file_url}
              alt={item.caption || "Media"}
              className="max-w-full max-h-[70vh] rounded-lg object-contain"
            />
          )}
        </div>
        
        {item.caption && (
          <div className="p-4 bg-black/60 border-t border-white/10">
            <p className="text-sm text-white/90">{item.caption}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MediaViewerDialog;