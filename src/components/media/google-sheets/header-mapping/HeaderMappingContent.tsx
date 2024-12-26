import { ScrollArea } from "@/components/ui/scroll-area";
import { HeaderMappingSelect } from './HeaderMappingSelect';

interface HeaderMappingContentProps {
  sheetHeaders: string[];
  mapping: Record<string, string>;
  dbColumns: string[];
  onMappingChange: (header: string, value: string) => void;
}

export const HeaderMappingContent = ({
  sheetHeaders,
  mapping,
  dbColumns,
  onMappingChange,
}: HeaderMappingContentProps) => {
  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="space-y-4">
        {sheetHeaders.map((header) => (
          <HeaderMappingSelect
            key={header}
            header={header}
            value={mapping[header] || ""}
            dbColumns={dbColumns}
            onChange={(value) => onMappingChange(header, value)}
          />
        ))}
      </div>
    </ScrollArea>
  );
};