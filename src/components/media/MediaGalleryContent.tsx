import { ScrollArea } from "@/components/ui/scroll-area";
import MediaCard from "./MediaCard";
import { MediaItem } from "./types";

interface MediaGalleryContentProps {
  mediaItems: MediaItem[];
  selectedMedia: Set<string>;
  onToggleSelect: (id: string) => void;
}

const MediaGalleryContent = ({ mediaItems, selectedMedia, onToggleSelect }: MediaGalleryContentProps) => {
  console.log("MediaGalleryContent received items:", mediaItems?.length);
  
  if (!mediaItems) {
    console.log("No media items received");
    return (
      <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10 backdrop-blur-xl">
        <p className="text-gray-400">
          No media items found. There might be an issue with data loading.
        </p>
      </div>
    );
  }

  if (mediaItems.length === 0) {
    console.log("Empty media items array received");
    return (
      <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10 backdrop-blur-xl">
        <p className="text-gray-400">
          No media files yet. Send some media to your Telegram bot!
        </p>
      </div>
    );
  }

  console.log("Rendering media grid with items:", mediaItems.length);
  return (
    <ScrollArea className="h-[calc(100vh-16rem)] w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-6">
        {mediaItems.map((item) => (
          <MediaCard 
            key={item.id} 
            item={item}
            isSelected={selectedMedia.has(item.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default MediaGalleryContent;