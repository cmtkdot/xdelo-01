import { Calendar } from "lucide-react";
import { MediaItem } from "../types";
import { format } from "date-fns";

interface MediaViewerDetailsProps {
  item: MediaItem;
}

export const MediaViewerDetails = ({ item }: MediaViewerDetailsProps) => {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Details
      </h4>
      <div className="space-y-1">
        {item.created_at && (
          <p className="text-sm text-gray-700 dark:text-white/90">
            Created: {format(new Date(item.created_at), 'PPpp')}
          </p>
        )}
        {item.updated_at && (
          <p className="text-sm text-gray-700 dark:text-white/90">
            Updated: {format(new Date(item.updated_at), 'PPpp')}
          </p>
        )}
        {item.chat?.title && (
          <p className="text-sm text-gray-700 dark:text-white/90">
            Channel: {item.chat.title}
          </p>
        )}
      </div>
    </div>
  );
};