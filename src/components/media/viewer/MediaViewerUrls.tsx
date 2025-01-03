import { Link2 } from "lucide-react";
import { MediaItem } from "../types";

interface MediaViewerUrlsProps {
  item: MediaItem;
}

export const MediaViewerUrls = ({ item }: MediaViewerUrlsProps) => {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-700 dark:text-white/80">File URLs</h4>
      <div className="space-y-1">
        {item.file_url && (
          <div className="flex items-center gap-2 text-xs">
            <Link2 className="w-3 h-3 text-blue-500" />
            <a 
              href={item.file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline truncate"
            >
              Original File URL
            </a>
          </div>
        )}
        {item.google_drive_url && (
          <div className="flex items-center gap-2 text-xs">
            <Link2 className="w-3 h-3 text-green-500" />
            <a 
              href={item.google_drive_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-green-500 hover:underline truncate"
            >
              Google Drive URL
            </a>
          </div>
        )}
        {item.public_url && (
          <div className="flex items-center gap-2 text-xs">
            <Link2 className="w-3 h-3 text-purple-500" />
            <a 
              href={item.public_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-500 hover:underline truncate"
            >
              Public URL
            </a>
          </div>
        )}
      </div>
    </div>
  );
};