import { useState } from "react";
import { MediaItem } from "../types";

export const useMediaSelection = (mediaItems: MediaItem[] | null) => {
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());

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

  return {
    selectedMedia,
    handleToggleSelect,
    getSelectedMediaData,
  };
};