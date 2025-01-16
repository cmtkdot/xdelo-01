import { FileVideo, Image as ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaItem } from "../types";
import { DeleteMediaButton } from "./DeleteMediaButton";
import { SyncCaptionButton } from "./SyncCaptionButton";

interface MediaViewerHeaderProps {
  item: MediaItem;
  onUploadClick: () => void;
  onDelete: () => void;
}

export const MediaViewerHeader = ({ item, onUploadClick, onDelete }: MediaViewerHeaderProps) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        {item.media_type === "video" ? (
          <FileVideo className="w-4 h-4" />
        ) : (
          <ImageIcon className="w-4 h-4" />
        )}
        {item.file_name}
      </h3>
      <div className="flex items-center gap-2">
        <SyncCaptionButton item={item} />
        {!item.google_drive_url && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUploadClick}
            className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload to Drive
          </Button>
        )}
        <DeleteMediaButton item={item} onDelete={onDelete} />
      </div>
    </div>
  );
};