import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HeaderMappingSelectProps {
  header: string;
  value: string;
  dbColumns: string[];
  onChange: (value: string) => void;
}

export const HeaderMappingSelect = ({ 
  header, 
  value, 
  dbColumns, 
  onChange 
}: HeaderMappingSelectProps) => {
  return (
    <div className="flex items-center gap-4">
      <span className="min-w-[120px] text-sm">{header}</span>
      <Select
        value={value || "none"}
        onValueChange={onChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Map to column" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {dbColumns.map((column) => (
            <SelectItem key={column} value={column}>
              {column}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};