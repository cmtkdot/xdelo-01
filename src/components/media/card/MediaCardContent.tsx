import { formatDistanceToNow } from "date-fns";
import { MediaItem } from "../types";

interface MediaCardContentProps {
  item: MediaItem;
}

export const MediaCardContent = ({ item }: MediaCardContentProps) => {
  return (
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
          {formatDistanceToNow(new Date(item.created_at || ''), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};