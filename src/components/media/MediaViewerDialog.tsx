import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MediaItem } from "./types";
import { X } from "lucide-react";
import { useState } from "react";
import { DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface MediaViewerDialogProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const MediaViewerDialog = ({ item, isOpen, onClose }: MediaViewerDialogProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!item) return null;

  const isVideo = item.media_type === "video";
  const displayUrl = item.file_url || item.google_drive_url;

  const handleMediaLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleMediaError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] max-h-[80vh] p-0 bg-white/95 dark:bg-black/90 border-gray-200/50 dark:border-white/10 shadow-lg">
        <VisuallyHidden>
          <DialogTitle>Media Viewer</DialogTitle>
        </VisuallyHidden>
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50"
        >
          <X className="h-4 w-4 text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white" />
          <span className="sr-only">Close</span>
        </button>
        
        <div className="relative w-full h-full min-h-[200px] flex items-center justify-center p-4 bg-gray-50/50 dark:bg-black/60">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="animate-pulse w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Failed to load media</p>
            </div>
          )}

          {isVideo ? (
            <video
              src={displayUrl}
              className="max-w-full max-h-[70vh] rounded-lg shadow-md"
              controls
              autoPlay
              playsInline
              onLoadedData={handleMediaLoad}
              onError={handleMediaError}
            />
          ) : (
            <img
              src={displayUrl}
              alt={item.caption || "Media"}
              className="max-w-full max-h-[70vh] rounded-lg object-contain shadow-md"
              onLoad={handleMediaLoad}
              onError={handleMediaError}
            />
          )}
        </div>
        
        {item.caption && (
          <div className="p-4 bg-white/80 dark:bg-black/60 border-t border-gray-200/50 dark:border-white/10">
            <p className="text-sm text-gray-700 dark:text-white/90">{item.caption}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MediaViewerDialog;