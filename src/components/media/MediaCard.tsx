import { useState } from "react";
import { MediaItem } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import MediaViewerDialog from "./MediaViewerDialog";
import { validateMediaUrl, generatePublicUrl } from "./utils/urlValidation";
import { useToast } from "@/hooks/use-toast";

interface MediaCardProps {
  item: MediaItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const MediaCard = ({ item, isSelected, onToggleSelect }: MediaCardProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();
  const isVideo = item.media_type === "video" || item.media_type?.includes('video');

  // Validate and prioritize URLs with fallback logic
  const displayUrl = (() => {
    console.log(`Validating URLs for media item ${item.id}`);
    
    // Try each URL in order of preference
    const urls = [
      { url: item.file_url, type: 'file URL' },
      { url: item.public_url, type: 'public URL' },
      { url: item.google_drive_url, type: 'Google Drive URL' }
    ];

    for (const { url, type } of urls) {
      const validatedUrl = validateMediaUrl(url, item.media_type);
      if (validatedUrl) {
        console.log(`Using validated ${type}: ${validatedUrl}`);
        return validatedUrl;
      }
    }

    // If no valid URLs found, generate a new public URL
    const generatedUrl = generatePublicUrl(item.file_name, item.media_type);
    console.log(`Generated new public URL: ${generatedUrl}`);
    return generatedUrl;
  })();

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.checkbox-area')) {
      return;
    }
    setIsDialogOpen(true);
  };

  const handleMediaLoad = () => {
    console.log(`Media loaded successfully: ${item.id}`);
    setIsLoading(false);
    setHasError(false);
  };

  const handleMediaError = () => {
    console.error(`Failed to load media: ${item.id}`);
    setIsLoading(false);
    setHasError(true);
    toast({
      title: "Media Load Error",
      description: "Failed to load media file. Trying alternative sources...",
      variant: "destructive",
    });
  };

  if (!displayUrl) {
    return (
      <Card className="group relative overflow-hidden backdrop-blur-xl bg-white/90 dark:bg-black/40 border border-gray-200/50 dark:border-white/10">
        <CardContent className="p-4 text-center text-red-500">
          Invalid media URL
        </CardContent>
      </Card>
    );
  }

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
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <div className="animate-pulse w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
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
                className="absolute inset-0 w-full h-full object-cover"
                preload="metadata"
                playsInline
                muted
                onLoadedData={handleMediaLoad}
                onError={handleMediaError}
              />
            ) : (
              <img
                src={displayUrl}
                alt={item.caption || "Media"}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                onLoad={handleMediaLoad}
                onError={handleMediaError}
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
        item={item}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
};

export default MediaCard;