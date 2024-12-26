import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MediaItem } from "../types";
import { SortConfig } from "./hooks/useMediaTableSort";

interface MediaTableHeaderProps {
  onSort: (column: keyof MediaItem) => void;
  onSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  someSelected: boolean;
  sortConfig: SortConfig;
}

export const MediaTableHeader = ({ 
  onSort, 
  onSelectAll,
  allSelected,
  someSelected,
  sortConfig
}: MediaTableHeaderProps) => {
  const renderSortButton = (column: keyof MediaItem, label: string) => {
    const isActive = sortConfig.column === column;
    const Icon = isActive 
      ? sortConfig.direction === 'asc' 
        ? ArrowUp 
        : ArrowDown
      : ArrowUpDown;

    return (
      <Button
        variant="ghost"
        onClick={() => onSort(column)}
        className={`h-8 flex items-center gap-1 px-2 hover:bg-white/5 ${isActive ? 'text-purple-400' : ''}`}
      >
        {label}
        <Icon className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <TableHeader className="bg-black/60 sticky top-0 z-10">
      <TableRow>
        <TableHead className="text-sky-400 w-[100px]">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onCheckedChange={onSelectAll}
            className="bg-white/20 border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
          />
        </TableHead>
        <TableHead className="text-sky-400 w-[150px]">
          {renderSortButton('media_type', 'Type')}
        </TableHead>
        <TableHead className="text-sky-400 w-[150px]">
          {renderSortButton('chat_id', 'Channel')}
        </TableHead>
        <TableHead className="text-sky-400 w-[200px]">
          {renderSortButton('created_at', 'Created At')}
        </TableHead>
        <TableHead className="text-sky-400 w-[300px]">
          {renderSortButton('caption', 'Caption')}
        </TableHead>
        <TableHead className="text-sky-400 w-[400px]">
          {renderSortButton('file_url', 'File URL')}
        </TableHead>
        <TableHead className="text-sky-400 text-right w-[200px]">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};