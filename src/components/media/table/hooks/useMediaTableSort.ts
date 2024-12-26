import { useState } from "react";
import { MediaItem } from "../../types";

export type SortConfig = {
  column: keyof MediaItem | null;
  direction: 'asc' | 'desc';
};

export const useMediaTableSort = (mediaItems: MediaItem[] | undefined) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'created_at', direction: 'desc' });

  const handleSort = (column: keyof MediaItem) => {
    setSortConfig(prevConfig => ({
      column,
      direction: prevConfig.column === column && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedMediaItems = mediaItems ? [...mediaItems].sort((a, b) => {
    if (!sortConfig.column) return 0;

    let aValue = a[sortConfig.column];
    let bValue = b[sortConfig.column];

    // Handle nested chat object for channel title
    if (sortConfig.column === 'chat_id') {
      aValue = a.chat?.title || '';
      bValue = b.chat?.title || '';
    }

    // Handle date strings
    if (sortConfig.column === 'created_at') {
      return sortConfig.direction === 'asc' 
        ? new Date(aValue as string).getTime() - new Date(bValue as string).getTime()
        : new Date(bValue as string).getTime() - new Date(aValue as string).getTime();
    }

    // Handle strings and other types
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  }) : [];

  return {
    sortedMediaItems,
    handleSort,
    sortConfig,
  };
};