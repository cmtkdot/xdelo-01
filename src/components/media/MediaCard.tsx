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

  // Prioritize Google Drive URL if available
  const displayUrl = item.google_drive_url || item.file_url;

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
        className="group relative overflow-hidden backdrop-blur-xl bg-white/90 dark:bg-black/40 border border-gray-200/50 dark:border-white/10 hover:bg-white/95 dark:hover:bg-black/50 transition-all duration-300 cursor-pointer shadow-sm h-full"
        onClick={handleCardClick}
      >
        <div className="absolute top-1.5 left-1.5 z-10 checkbox-area">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(item.id)}
            className="h-[18px] w-[18px] bg-white/80 border-gray-300 dark:bg-white/20 dark:border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
          />
        </div>
        
        <CardContent className="p-0 flex flex-col h-full">
          <div className="relative w-full aspect-square group-hover:scale-105 transition-transform duration-300">
            {isVideo ? (
              <video
                src={displayUrl}
                className="absolute inset-0 w-full h-full object-cover"
                preload="metadata"
              />
            ) : (
              <img
                src={displayUrl}
                alt={item.caption || "Media"}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )}
          </div>
          
          <div className="p-1.5 sm:p-2 md:p-3 space-y-1 flex-1 flex flex-col bg-white/95 dark:bg-black/60 backdrop-blur-sm">
            {item.caption && (
              <p className="text-[11px] sm:text-xs md:text-sm text-gray-700 dark:text-white/90 font-medium line-clamp-2 flex-1">
                {item.caption}
              </p>
            )}
            
            <div className="flex justify-between items-center text-[9px] sm:text-[10px] md:text-xs text-gray-600 dark:text-white/90 mt-auto font-medium">
              <span className="truncate max-w-[80px] sm:max-w-[100px] md:max-w-[120px]">
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
        item={{
          ...item,
          file_url: displayUrl // Use the Google Drive URL in the viewer dialog
        }}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
};

export default MediaCard;