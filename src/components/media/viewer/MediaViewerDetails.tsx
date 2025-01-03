import { Calendar } from "lucide-react";
import { MediaItem } from "../types";
import { format } from "date-fns";

interface MediaViewerDetailsProps {
  item: MediaItem;
}

export const MediaViewerDetails = ({ item }: MediaViewerDetailsProps) => {
  const formatDate = (date: string | undefined) => {
    if (!date) return "N/A";
    return format(new Date(date), "PPpp");
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-white/80">Upload Details</h4>
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <p>Type: {item.media_type}</p>
          <p>Channel: {item.chat?.title || 'N/A'}</p>
          <p>Drive ID: {item.google_drive_id || 'Not uploaded'}</p>
          <p>Media Group: {item.media_group_id || 'None'}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-white/80">Dates</h4>
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Created: {formatDate(item.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Updated: {formatDate(item.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};