import { useState } from "react";
import { MediaItem } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import MediaViewerDialog from "./MediaViewerDialog";

interface MediaCardProps {
  item: MediaItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const MediaCard = ({ item, isSelected, onToggleSelect }: MediaCardProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isVideo = item.media_type === "video";

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent opening dialog when clicking checkbox
    if ((e.target as HTMLElement).closest('.checkbox-area')) {
      return;
    }
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card 
        className="group relative overflow-hidden backdrop-blur-xl bg-black/40 border border-white/10 hover:bg-black/50 transition-all duration-300 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="absolute top-2 left-2 z-10 checkbox-area">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(item.id)}
            className="bg-white/20 border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
          />
        </div>
        
        <CardContent className="p-0 flex flex-col h-full">
          <div className="relative w-full h-48 group-hover:scale-105 transition-transform duration-300">
            {isVideo ? (
              <video
                src={item.file_url}
                className="absolute inset-0 w-full h-full object-cover rounded-t-lg"
                preload="metadata"
              />
            ) : (
              <img
                src={item.file_url}
                alt={item.caption || "Media"}
                className="absolute inset-0 w-full h-full object-cover rounded-t-lg"
                loading="lazy"
              />
            )}
          </div>
          
          <div className="p-2 md:p-3 space-y-1.5 flex-1 flex flex-col bg-black/60 backdrop-blur-sm">
            {item.caption && (
              <p className="text-xs md:text-sm text-white/90 font-medium line-clamp-2 flex-1">
                {item.caption}
              </p>
            )}
            
            <div className="flex justify-between items-center text-[10px] md:text-xs text-white/90 mt-auto font-medium">
              <span className="truncate max-w-[100px] md:max-w-[120px]">
                {item.chat?.title || "Unknown Channel"}
              </span>
              <span className="shrink-0">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <MediaViewerDialog
        item={item}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
};

export default MediaCard;