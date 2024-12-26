import { Table, TableBody } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { MediaItem } from "../types";
import { MediaTableHeader } from "./MediaTableHeader";
import { MediaTableRow } from "./MediaTableRow";
import { SortConfig } from "./hooks/useMediaTableSort";

interface MediaTableContentProps {
  isLoading: boolean;
  mediaItems: MediaItem[];
  onSort: (column: keyof MediaItem) => void;
  onSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  someSelected: boolean;
  selectedMedia: MediaItem[];
  onToggleSelect: (item: MediaItem, index: number, event?: React.MouseEvent) => void;
  onOpenFile: (url: string) => void;
  sortConfig: SortConfig;
}

export const MediaTableContent = ({
  isLoading,
  mediaItems,
  onSort,
  onSelectAll,
  allSelected,
  someSelected,
  selectedMedia,
  onToggleSelect,
  onOpenFile,
  sortConfig,
}: MediaTableContentProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-16rem)]" type="always">
      <div className="min-w-[1400px]">
        <Table>
          <MediaTableHeader 
            onSort={onSort}
            onSelectAll={onSelectAll}
            allSelected={allSelected}
            someSelected={someSelected}
            sortConfig={sortConfig}
          />
          <TableBody>
            {mediaItems?.map((item, index) => (
              <MediaTableRow
                key={item.id}
                item={item}
                onOpenFile={onOpenFile}
                isSelected={selectedMedia.some(media => media.id === item.id)}
                onToggleSelect={(e) => onToggleSelect(item, index, e)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};