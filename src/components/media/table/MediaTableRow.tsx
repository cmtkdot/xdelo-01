import { format } from "date-fns";
import { TableCell, TableRow } from "@/components/ui/table";
import { MediaItem } from "../types";
import { MediaTableActions } from "./MediaTableActions";
import { Checkbox } from "@/components/ui/checkbox";
import { MediaTableUrls } from "./MediaTableUrls";
import { MediaTableCaption } from "./MediaTableCaption";

interface MediaTableRowProps {
  item: MediaItem;
  onOpenFile: (url: string) => void;
  isSelected: boolean;
  onToggleSelect: (e?: React.MouseEvent) => void;
  onDelete: () => void;
}

export const MediaTableRow = ({ 
  item, 
  onOpenFile, 
  isSelected,
  onToggleSelect,
  onDelete
}: MediaTableRowProps) => {
  const handleRowClick = (e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLElement && 
      (e.target.closest('button') || e.target.closest('a') || e.target.closest('input'))
    ) {
      return;
    }
    
    const syntheticEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
    });
    
    onToggleSelect(syntheticEvent as unknown as React.MouseEvent);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    const syntheticEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
    });
    
    onToggleSelect(syntheticEvent as unknown as React.MouseEvent);
  };

  const messageId = typeof item.metadata === 'object' && item.metadata !== null 
    ? (item.metadata as Record<string, any>).message_id 
    : undefined;

  return (
    <TableRow 
      className={`hover:bg-white/5 cursor-pointer ${isSelected ? 'bg-white/10' : ''}`}
      onClick={handleRowClick}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div onClick={handleCheckboxClick}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => {}}
            className="bg-white/20 border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
          />
        </div>
      </TableCell>
      <TableCell className="text-white/70 whitespace-nowrap">{item.media_type}</TableCell>
      <TableCell className="text-white/70 whitespace-nowrap">{item.chat?.title || 'N/A'}</TableCell>
      <TableCell className="text-white/70 whitespace-nowrap">
        {item.created_at ? format(new Date(item.created_at), 'PPpp') : 'N/A'}
      </TableCell>
      <TableCell className="text-white/70 whitespace-nowrap">
        {item.updated_at ? format(new Date(item.updated_at), 'PPpp') : 'N/A'}
      </TableCell>
      <TableCell className="text-white/70">
        <MediaTableCaption id={item.id} initialCaption={item.caption} />
      </TableCell>
      <TableCell className="text-white/70">
        <MediaTableUrls
          googleDriveUrl={item.google_drive_url}
          publicUrl={item.public_url}
          fileUrl={item.file_url}
          onOpenFile={() => onOpenFile(item.file_url)}
        />
      </TableCell>
      <TableCell>
        <MediaTableActions
          id={item.id}
          fileUrl={item.file_url}
          fileName={item.file_name}
          chatId={item.chat_id}
          messageId={messageId}
          onView={() => onOpenFile(item.file_url)}
          hasGoogleDrive={!!item.google_drive_url}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
};