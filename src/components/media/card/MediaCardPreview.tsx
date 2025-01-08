import { MediaItem } from "../types";

interface MediaCardPreviewProps {
  item: MediaItem;
  displayUrl: string;
  onLoad: () => void;
  onError: () => void;
}

export const MediaCardPreview = ({ item, displayUrl, onLoad, onError }: MediaCardPreviewProps) => {
  const isVideo = item.media_type === "video" || item.media_type?.includes('video');
  const mediaUrl = item.public_url || item.file_url; // Prioritize public_url with fallback to file_url
  console.log(`Rendering media preview for ${item.id} with URL: ${mediaUrl}`);

  return (
    <div className="relative w-full aspect-square group-hover:scale-105 transition-transform duration-300">
      {isVideo ? (
        <video
          src={mediaUrl}
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
          src={mediaUrl}
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