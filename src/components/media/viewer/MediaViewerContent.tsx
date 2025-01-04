import { MediaItem } from "../types";

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
  const isVideo = item.media_type === "video" || item.media_type?.includes('video');
  const displayUrl = item.file_url || item.google_drive_url;

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