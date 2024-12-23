import { useEffect, useState } from "react";
import useMediaData from "./media/hooks/useMediaData";
import useMediaSubscription from "./media/hooks/useMediaSubscription";
import MediaCard from "./media/MediaCard";
import MediaFilters from "./media/MediaFilters";
import MediaGallerySkeleton from "./media/MediaGallerySkeleton";
import { MediaFilter } from "./media/types";
import { Image } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import WebhookInterface from "./webhook/WebhookInterface";
import { supabase } from "@/integrations/supabase/client";
import { Channel } from "./media/types";

const MediaGallery = () => {
  const [filter, setFilter] = useState<MediaFilter>({
    selectedChannel: "all",
    selectedType: "all",
  });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: mediaItems, isLoading } = useMediaData(filter);
  useMediaSubscription();

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('title, chat_id');
    
    if (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
      });
      return;
    }
    
    setChannels(data || []);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedMedia(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getSelectedMediaData = () => {
    if (!mediaItems) return [];
    return mediaItems.filter(item => selectedMedia.has(item.id));
  };

  if (isLoading) {
    return <MediaGallerySkeleton />;
  }

  return (
    <div className="w-full max-w-[2000px] mx-auto space-y-4">
      <div className="flex items-center gap-2 glass-card p-4">
        <Image className="w-6 h-6 text-purple-400" />
        <h2 className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
          Media Gallery
        </h2>
      </div>
      
      <div className="glass-card p-4 md:p-6">
        <WebhookInterface selectedMedia={getSelectedMediaData()} />
      </div>
      
      <div className="glass-card p-4 md:p-6">
        <MediaFilters
          selectedChannel={filter.selectedChannel}
          setSelectedChannel={(value) => setFilter(prev => ({ ...prev, selectedChannel: value }))}
          selectedType={filter.selectedType}
          setSelectedType={(value) => setFilter(prev => ({ ...prev, selectedType: value }))}
          channels={channels}
        />
      </div>

      {!mediaItems || mediaItems.length === 0 ? (
        <div className="glass-card p-4 md:p-6 text-center">
          <p className="text-white/80 text-sm md:text-base">
            No media files yet. Send some media to your Telegram bot!
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4 pb-6">
            {mediaItems.map((item) => (
              <MediaCard 
                key={item.id} 
                item={item}
                isSelected={selectedMedia.has(item.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default MediaGallery;