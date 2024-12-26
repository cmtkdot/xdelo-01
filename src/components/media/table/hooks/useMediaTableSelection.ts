import { useState, useRef } from "react";
import { MediaItem } from "../../types";

export const useMediaTableSelection = (mediaItems: MediaItem[] | undefined) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const lastSelectedIndex = useRef<number>(-1);

  const handleToggleSelect = (item: MediaItem, index: number, event?: React.MouseEvent) => {
    setSelectedMedia(prev => {
      let newSelection = [...prev];
      const isSelected = prev.some(media => media.id === item.id);

      if (event?.shiftKey && lastSelectedIndex.current !== -1 && mediaItems) {
        // Handle shift+click for range selection
        const start = Math.min(lastSelectedIndex.current, index);
        const end = Math.max(lastSelectedIndex.current, index);
        const itemsInRange = mediaItems.slice(start, end + 1);
        
        if (isSelected) {
          // If the clicked item was selected, remove the range
          newSelection = newSelection.filter(
            media => !itemsInRange.some(rangeItem => rangeItem.id === media.id)
          );
        } else {
          // If the clicked item wasn't selected, add the range
          itemsInRange.forEach(rangeItem => {
            if (!newSelection.some(media => media.id === rangeItem.id)) {
              newSelection.push(rangeItem);
            }
          });
        }
      } else if (event?.ctrlKey || event?.metaKey) {
        // Handle ctrl/cmd+click for individual toggle
        if (isSelected) {
          newSelection = newSelection.filter(media => media.id !== item.id);
        } else {
          newSelection.push(item);
        }
      } else {
        // Normal click - replace selection
        newSelection = isSelected ? [] : [item];
      }

      lastSelectedIndex.current = index;
      return newSelection;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && mediaItems) {
      setSelectedMedia(mediaItems);
    } else {
      setSelectedMedia([]);
    }
    lastSelectedIndex.current = -1;
  };

  const allSelected = mediaItems ? selectedMedia.length === mediaItems.length : false;
  const someSelected = selectedMedia.length > 0 && (!mediaItems || selectedMedia.length < mediaItems.length);

  return {
    selectedMedia,
    handleToggleSelect,
    handleSelectAll,
    allSelected,
    someSelected,
  };
};