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
  onRefetch: () => void;
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
  onRefetch,
}: MediaTableContentProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] rounded-lg border border-border bg-card">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!mediaItems.length) {
    return (
      <div className="flex items-center justify-center h-[400px] rounded-lg border border-border bg-card text-muted-foreground">
        No media items found
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-12rem)] border rounded-lg border-border bg-card overflow-hidden">
      <ScrollArea className="h-full">
        <div className="min-w-[800px]">
          <Table>
            <MediaTableHeader 
              onSort={onSort}
              onSelectAll={onSelectAll}
              allSelected={allSelected}
              someSelected={someSelected}
              sortConfig={sortConfig}
            />
            <TableBody>
              {mediaItems.map((item, index) => (
                <MediaTableRow
                  key={item.id}
                  item={item}
                  isSelected={selectedMedia.some(selected => selected.id === item.id)}
                  onToggleSelect={(e) => onToggleSelect(item, index, e)}
                  onOpenFile={onOpenFile}
                  onDelete={onRefetch}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};