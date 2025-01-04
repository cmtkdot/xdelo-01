import { MediaItem } from "../types";
import { validateMediaUrl } from "../utils/urlValidation";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface MediaViewerContentProps {
  item: MediaItem;
  isLoading: boolean;
  hasError: boolean;
  onMediaLoad: () => void;
  onMediaError: () => void;
}

export const MediaViewerContent = ({
  item,
  isLoading,
  hasError,
  onMediaLoad,
  onMediaError
}: MediaViewerContentProps) => {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const isVideo = item.media_type === "video" || item.media_type?.includes('video');

  useEffect(() => {
    // Try file_url first, then fall back to public_url
    const validatedUrl = validateMediaUrl(item.file_url) || validateMediaUrl(item.public_url);
    if (validatedUrl) {
      console.log(`Using validated URL in viewer: ${validatedUrl}`);
      setDisplayUrl(validatedUrl);
    } else {
      console.error('No valid URL available for media item:', item);
      toast({
        title: "Error",
        description: "No valid media URL available",
        variant: "destructive"
      });
    }
  }, [item]);

  if (!displayUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">No valid media URL available</p>
      </div>
    );
  }

  return (
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
          onLoadedData={onMediaLoad}
          onError={onMediaError}
        />
      ) : (
        <img
          src={displayUrl}
          alt={item.caption || "Media"}
          className="max-w-full max-h-[50vh] rounded-lg object-contain shadow-md"
          onLoad={onMediaLoad}
          onError={onMediaError}
        />
      )}
    </div>
  );
};