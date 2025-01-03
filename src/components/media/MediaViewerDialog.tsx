import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MediaItem } from "./types";
import { X, Link2, Calendar, FileVideo, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MediaViewerContent } from "./viewer/MediaViewerContent";
import { MediaViewerUrls } from "./viewer/MediaViewerUrls";
import { MediaViewerDetails } from "./viewer/MediaViewerDetails";
import { MediaViewerMetadata } from "./viewer/MediaViewerMetadata";

interface MediaViewerDialogProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const MediaViewerDialog = ({ item, isOpen, onClose }: MediaViewerDialogProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!item) return null;

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
      <DialogContent className="max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] max-h-[90vh] p-0 bg-white/95 dark:bg-black/90 border-gray-200/50 dark:border-white/10 shadow-lg">
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

        <MediaViewerContent
          item={item}
          isLoading={isLoading}
          hasError={hasError}
          onMediaLoad={handleMediaLoad}
          onMediaError={handleMediaError}
        />
        
        <ScrollArea className="flex-1 p-4 bg-white/80 dark:bg-black/60 border-t border-gray-200/50 dark:border-white/10 max-h-[40vh]">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {item.media_type === "video" ? (
                  <FileVideo className="w-4 h-4" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
                {item.file_name}
              </h3>
              {item.caption && (
                <p className="text-sm text-gray-700 dark:text-white/90">
                  {item.caption}
                </p>
              )}
            </div>

            <Separator className="bg-gray-200/50 dark:bg-white/10" />

            <MediaViewerUrls item={item} />

            <Separator className="bg-gray-200/50 dark:bg-white/10" />

            <MediaViewerDetails item={item} />

            <MediaViewerMetadata item={item} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MediaViewerDialog;