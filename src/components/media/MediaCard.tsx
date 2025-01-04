import { useState } from "react";
import { MediaItem } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import MediaViewerDialog from "./MediaViewerDialog";
import { validateMediaUrl, generatePublicUrl } from "./utils/urlValidation";
import { useToast } from "@/hooks/use-toast";
import { MediaCardCheckbox } from "./card/MediaCardCheckbox";
import { MediaCardContent } from "./card/MediaCardContent";
import { MediaCardPreview } from "./card/MediaCardPreview";
import { MediaLoadingState } from "./card/MediaLoadingState";

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

  // Validate and prioritize URLs with fallback logic
  const displayUrl = (() => {
    console.log(`Validating URLs for media item ${item.id}`);
    
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
        <MediaCardCheckbox 
          isSelected={isSelected}
          onToggleSelect={() => onToggleSelect(item.id)}
        />
        
        <CardContent className="p-0 flex flex-col h-full">
          <MediaLoadingState isLoading={isLoading} hasError={hasError} />
          
          <MediaCardPreview
            item={item}
            displayUrl={displayUrl}
            onLoad={handleMediaLoad}
            onError={handleMediaError}
          />
          
          <MediaCardContent item={item} />
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