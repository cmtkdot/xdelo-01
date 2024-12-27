import { useEffect, useState } from "react";
import useMediaData from "./hooks/useMediaData";
import useMediaSubscription from "./hooks/useMediaSubscription";
import MediaCard from "./MediaCard";
import MediaFilters from "./MediaFilters";
import MediaGallerySkeleton from "./MediaGallerySkeleton";
import { MediaFilter, Channel } from "./types";
import { Image } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import WebhookInterface from "../webhook/WebhookInterface";
import { supabase } from "@/integrations/supabase/client";

const MediaGallery = () => {
  const [filter, setFilter] = useState<MediaFilter>({
    selectedChannel: "all",
    selectedType: "all",
    uploadStatus: "all"
  });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: mediaItems, isLoading } = useMediaData(filter);
  useMediaSubscription();

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('id, title, chat_id');  // Added id to the selection
    
    if (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
      });
      return;
    }
    
    setChannels(data as Channel[]);  // Type assertion to Channel[]
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
      <div className="flex items-center gap-2 backdrop-blur-xl bg-black/40 border border-white/10 p-4 rounded-lg">
        <Image className="w-6 h-6 text-purple-400" />
        <h2 className="text-lg md:text-xl font-bold text-white/90">
          Media Gallery
        </h2>
      </div>
      
      <div className="backdrop-blur-xl bg-black/40 border border-white/10 p-4 md:p-6 rounded-lg">
        <WebhookInterface selectedMedia={getSelectedMediaData()} />
      </div>
      
      <div className="backdrop-blur-xl bg-black/40 border border-white/10 p-4 md:p-6 rounded-lg">
        <MediaFilters
          selectedChannel={filter.selectedChannel}
          setSelectedChannel={(value) => setFilter(prev => ({ ...prev, selectedChannel: value }))}
          selectedType={filter.selectedType}
          setSelectedType={(value) => setFilter(prev => ({ ...prev, selectedType: value }))}
          uploadStatus={filter.uploadStatus}
          setUploadStatus={(value) => setFilter(prev => ({ ...prev, uploadStatus: value }))}
          channels={channels}
        />
      </div>

      {!mediaItems || mediaItems.length === 0 ? (
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 p-4 md:p-6 rounded-lg text-center">
          <p className="text-white/90 text-sm md:text-base font-medium">
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
