import { format } from "date-fns";
import { Link2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { MediaItem } from "../types";
import { MediaTableActions } from "./MediaTableActions";
import { Checkbox } from "@/components/ui/checkbox";

interface MediaTableRowProps {
  item: MediaItem;
  onOpenFile: (url: string) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export const MediaTableRow = ({ 
  item, 
  onOpenFile, 
  isSelected,
  onToggleSelect 
}: MediaTableRowProps) => {
  // Prioritize Google Drive URL if available
  const fileUrl = item.google_drive_url || item.file_url;
  
  return (
    <TableRow className="hover:bg-white/5">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="bg-white/20 border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
        />
      </TableCell>
      <TableCell className="text-white/70 whitespace-nowrap">{item.media_type}</TableCell>
      <TableCell className="text-white/70 whitespace-nowrap">{item.chat?.title || 'N/A'}</TableCell>
      <TableCell className="text-white/70 whitespace-nowrap">
        {item.created_at ? format(new Date(item.created_at), 'PPpp') : 'N/A'}
      </TableCell>
      <TableCell className="text-white/70">
        <div className="max-w-[300px] truncate">
          {item.caption || 'No caption'}
        </div>
      </TableCell>
      <TableCell className="text-white/70">
        <button
          onClick={() => onOpenFile(fileUrl)}
          className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors group"
        >
          <Link2 className="w-4 h-4 flex-shrink-0" />
          <span className="truncate max-w-[300px] group-hover:underline">
            {fileUrl}
          </span>
        </button>
      </TableCell>
      <TableCell>
        <MediaTableActions
          fileUrl={item.file_url}
          fileName={item.file_name}
          onView={() => onOpenFile(fileUrl)}
          hasGoogleDrive={!!item.google_drive_url}
        />
      </TableCell>
    </TableRow>
  );
};