import { Link2 } from "lucide-react";
import { MediaItem } from "../types";
import { Button } from "@/components/ui/button";

interface MediaViewerUrlsProps {
  item: MediaItem;
}

export const MediaViewerUrls = ({ item }: MediaViewerUrlsProps) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-700 dark:text-white/80">File URLs</h4>
      <div className="space-y-2">
        {item.file_url && (
          <div className="flex items-center gap-2 text-xs group">
            <Link2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <a 
                href={item.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline break-all"
              >
                {item.file_url}
              </a>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(item.file_url)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Copy
            </Button>
          </div>
        )}
        {item.google_drive_url && (
          <div className="flex items-center gap-2 text-xs group">
            <Link2 className="w-3 h-3 text-green-500 flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <a 
                href={item.google_drive_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-500 hover:underline break-all"
              >
                {item.google_drive_url}
              </a>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(item.google_drive_url)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Copy
            </Button>
          </div>
        )}
        {item.public_url && (
          <div className="flex items-center gap-2 text-xs group">
            <Link2 className="w-3 h-3 text-purple-500 flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <a 
                href={item.public_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-500 hover:underline break-all"
              >
                {item.public_url}
              </a>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(item.public_url)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Copy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};