import { Link2 } from "lucide-react";
import { MediaItem } from "../types";

interface MediaViewerUrlsProps {
  item: MediaItem;
}

export const MediaViewerUrls = ({ item }: MediaViewerUrlsProps) => {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Link2 className="w-4 h-4" />
        URLs
      </h4>
      <div className="space-y-1">
        {item.file_url && (
          <p className="text-sm text-gray-700 dark:text-white/90 break-all">
            File URL: {item.file_url}
          </p>
        )}
        {item.google_drive_url && (
          <p className="text-sm text-gray-700 dark:text-white/90 break-all">
            Google Drive URL: {item.google_drive_url}
          </p>
        )}
        {item.public_url && (
          <p className="text-sm text-gray-700 dark:text-white/90 break-all">
            Public URL: {item.public_url}
          </p>
        )}
      </div>
    </div>
  );
};