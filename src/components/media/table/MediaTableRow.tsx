import { format } from "date-fns";
import { Link2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { MediaItem } from "../types";
import { MediaTableActions } from "./MediaTableActions";

interface MediaTableRowProps {
  item: MediaItem;
  onOpenFile: (url: string) => void;
}

export const MediaTableRow = ({ item, onOpenFile }: MediaTableRowProps) => {
  return (
    <TableRow className="hover:bg-white/5">
      <TableCell className="font-medium text-white/90 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {item.file_name}
        </div>
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
          onClick={() => onOpenFile(item.file_url)}
          className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors group"
        >
          <Link2 className="w-4 h-4 flex-shrink-0" />
          <span className="truncate max-w-[300px] group-hover:underline">
            {item.file_url}
          </span>
        </button>
      </TableCell>
      <TableCell>
        <MediaTableActions
          fileUrl={item.file_url}
          fileName={item.file_name}
          onView={() => onOpenFile(item.file_url)}
        />
      </TableCell>
    </TableRow>
  );
};