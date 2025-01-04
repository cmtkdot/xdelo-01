import { MediaItem } from "../types";

interface MediaCardPreviewProps {
  item: MediaItem;
  displayUrl: string;
  onLoad: () => void;
  onError: () => void;
}

export const MediaCardPreview = ({ item, displayUrl, onLoad, onError }: MediaCardPreviewProps) => {
  const isVideo = item.media_type === "video" || item.media_type?.includes('video');
  console.log(`Rendering media preview for ${item.id} with URL: ${displayUrl}`);

  return (
    <div className="relative w-full aspect-square group-hover:scale-105 transition-transform duration-300">
      {isVideo ? (
        <video
          src={displayUrl}
          className="absolute inset-0 w-full h-full object-cover"
          preload="metadata"
          playsInline
          muted
          onLoadedData={onLoad}
          onError={(e) => {
            console.error("Video load error:", e);
            onError();
          }}
        />
      ) : (
        <img
          src={displayUrl}
          alt={item.caption || "Media"}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onLoad={onLoad}
          onError={(e) => {
            console.error("Image load error:", e);
            onError();
          }}
        />
      )}
    </div>
  );
};