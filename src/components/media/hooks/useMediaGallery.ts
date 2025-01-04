import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MediaFilter, Channel } from "../types";
import { useToast } from "@/components/ui/use-toast";
import useMediaData from "./useMediaData";
import useMediaSubscription from "./useMediaSubscription";
import { useMediaOperations } from "./useMediaOperations";
import { useMediaSelection } from "./useMediaSelection";

export const useMediaGallery = () => {
  const [filter, setFilter] = useState<MediaFilter>({
    selectedChannel: "all",
    selectedType: "all",
    uploadStatus: "all"
  });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: mediaItems, isLoading, error, refetch } = useMediaData(filter);
  useMediaSubscription(() => refetch());

  const {
    isDeletingDuplicates,
    isSyncingCaptions,
    handleDeleteDuplicates,
    handleSyncCaptions,
  } = useMediaOperations(refetch);

  const {
    selectedMedia,
    handleToggleSelect,
    getSelectedMediaData,
  } = useMediaSelection(mediaItems);

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