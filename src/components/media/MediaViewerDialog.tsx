import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MediaItem } from "./types";
import { X, Link2, Calendar, FileVideo, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { DialogTitle } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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

  const formatDate = (date: string | undefined) => {
    if (!date) return "N/A";
    return format(new Date(date), "PPpp");
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
              className="max-w-full max-h-[50vh] rounded-lg shadow-md"
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
              className="max-w-full max-h-[50vh] rounded-lg object-contain shadow-md"
              onLoad={handleMediaLoad}
              onError={handleMediaError}
            />
          )}
        </div>
        
        <ScrollArea className="flex-1 p-4 bg-white/80 dark:bg-black/60 border-t border-gray-200/50 dark:border-white/10 max-h-[40vh]">
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {isVideo ? <FileVideo className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                {item.file_name}
              </h3>
              {item.caption && (
                <p className="text-sm text-gray-700 dark:text-white/90">{item.caption}</p>
              )}
            </div>

            <Separator className="bg-gray-200/50 dark:bg-white/10" />

            {/* URLs Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-white/80">File URLs</h4>
              <div className="space-y-1">
                {item.file_url && (
                  <div className="flex items-center gap-2 text-xs">
                    <Link2 className="w-3 h-3 text-blue-500" />
                    <a 
                      href={item.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline truncate"
                    >
                      Original File URL
                    </a>
                  </div>
                )}
                {item.google_drive_url && (
                  <div className="flex items-center gap-2 text-xs">
                    <Link2 className="w-3 h-3 text-green-500" />
                    <a 
                      href={item.google_drive_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-500 hover:underline truncate"
                    >
                      Google Drive URL
                    </a>
                  </div>
                )}
                {item.public_url && (
                  <div className="flex items-center gap-2 text-xs">
                    <Link2 className="w-3 h-3 text-purple-500" />
                    <a 
                      href={item.public_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-500 hover:underline truncate"
                    >
                      Public URL
                    </a>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-gray-200/50 dark:bg-white/10" />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-white/80">Upload Details</h4>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  <p>Type: {item.media_type}</p>
                  <p>Channel: {item.chat?.title || 'N/A'}</p>
                  <p>Drive ID: {item.google_drive_id || 'Not uploaded'}</p>
                  <p>Media Group: {item.media_group_id || 'None'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-white/80">Dates</h4>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Created: {formatDate(item.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Updated: {formatDate(item.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata Section */}
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <>
                <Separator className="bg-gray-200/50 dark:bg-white/10" />
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-white/80">Metadata</h4>
                  <pre className="text-xs bg-gray-50 dark:bg-black/40 p-2 rounded overflow-x-auto">
                    {JSON.stringify(item.metadata, null, 2)}
                  </pre>
                </div>
              </>
            )}

            {/* Additional Data Section */}
            {item.additional_data && Object.keys(item.additional_data).length > 0 && (
              <>
                <Separator className="bg-gray-200/50 dark:bg-white/10" />
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-white/80">Additional Data</h4>
                  <pre className="text-xs bg-gray-50 dark:bg-black/40 p-2 rounded overflow-x-auto">
                    {JSON.stringify(item.additional_data, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MediaViewerDialog;