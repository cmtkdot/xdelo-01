import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MediaFilter, Channel, MediaItem } from "../types";
import { useToast } from "@/components/ui/use-toast";
import useMediaData from "./useMediaData";
import useMediaSubscription from "./useMediaSubscription";

const useMediaGallery = () => {
  const [filter, setFilter] = useState<MediaFilter>({
    selectedChannel: "all",
    selectedType: "all",
    uploadStatus: "all"
  });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSyncingCaptions, setSyncingCaptions] = useState(false);
  const [isDeletingDuplicates, setDeletingDuplicates] = useState(false);
  const { toast } = useToast();

  const { data: mediaItems, isLoading, error, refetch } = useMediaData(filter);
  useMediaSubscription(() => refetch());

  useEffect(() => {
    console.log("MediaGallery data:", { mediaItems, isLoading, error });
  }, [mediaItems, isLoading, error]);

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

  const handleDeleteDuplicates = async () => {
    try {
      setDeletingDuplicates(true);
      const { error } = await supabase.functions.invoke('delete-duplicates', {
        body: { keepNewest: true }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Duplicate media files have been cleaned up",
      });

      refetch();
    } catch (error) {
      console.error('Error deleting duplicates:', error);
      toast({
        title: "Error",
        description: "Failed to delete duplicate media files",
        variant: "destructive",
      });
    } finally {
      setDeletingDuplicates(false);
    }
  };

  const handleSyncCaptions = async () => {
    try {
      setSyncingCaptions(true);
      
      // Get all active channels
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('chat_id')
        .eq('is_active', true);

      if (channelsError) throw channelsError;

      if (!channelsData || channelsData.length === 0) {
        toast({
          title: "No channels found",
          description: "Please add some channels first",
          variant: "destructive",
        });
        return;
      }

      const chatIds = channelsData.map(channel => channel.chat_id);
      console.log('Syncing captions for channels:', chatIds);

      const { error } = await supabase.functions.invoke('sync-media-captions', {
        body: { chatIds }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Media captions have been synchronized",
      });

      refetch();
    } catch (error) {
      console.error('Error syncing captions:', error);
      toast({
        title: "Error",
        description: "Failed to sync media captions",
        variant: "destructive",
      });
    } finally {
      setSyncingCaptions(false);
    }
  };

  return {
    filter,
    setFilter,
    channels,
    selectedMedia,
    handleToggleSelect,
    handleDeleteDuplicates,
    handleSyncCaptions,
    isSyncingCaptions,
    isDeletingDuplicates,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    getSelectedMediaData,
    mediaItems,
    isLoading,
    error
  };
};

export default useMediaGallery;