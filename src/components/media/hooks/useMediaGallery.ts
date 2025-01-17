import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMediaData } from "./useMediaData";
import useMediaSubscription from "./useMediaSubscription";
import { MediaFilter } from "../types";

export const useMediaGallery = () => {
  const [filter, setFilter] = useState<MediaFilter>({
    selectedChannel: "all",
    selectedType: "all",
    uploadStatus: "all"
  });
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSyncingCaptions, setSyncingCaptions] = useState(false);
  const [isDeletingDuplicates, setDeletingDuplicates] = useState(false);
  const { toast } = useToast();

  const { data: mediaItems, isLoading, error, refetch } = useMediaData(filter);
  useMediaSubscription(() => refetch());

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

  const handleDeleteDuplicates = async () => {
    try {
      setDeletingDuplicates(true);
      const { error } = await supabase.functions.invoke('delete-duplicates', {
        body: { keepNewest: true },
        headers: {
          'Content-Type': 'application/json'
        }
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
      const { error } = await supabase.functions.invoke('sync-media-captions', {
        body: { action: "sync" }, // Provide a non-empty body
        headers: {
          'Content-Type': 'application/json'
        }
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
    mediaItems,
    selectedMedia,
    handleToggleSelect,
    handleDeleteDuplicates,
    handleSyncCaptions,
    isSyncingCaptions,
    isDeletingDuplicates,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isLoading,
    error,
    refetch
  };
};
