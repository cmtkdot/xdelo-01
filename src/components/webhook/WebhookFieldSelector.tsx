import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface WebhookFieldSelectorProps {
  availableFields: string[];
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
  selectedMediaCount: number;
}

const WebhookFieldSelector = ({ 
  availableFields, 
  selectedFields, 
  onFieldsChange,
  selectedMediaCount 
}: WebhookFieldSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label className="text-white">Select Fields to Send ({selectedMediaCount} items selected)</Label>
      <ScrollArea className="h-[200px] rounded-md border border-white/10 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {availableFields.map((field) => (
            <div key={field} className="flex items-center space-x-2">
              <Checkbox
                id={field}
                checked={selectedFields.includes(field)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onFieldsChange([...selectedFields, field]);
                  } else {
                    onFieldsChange(selectedFields.filter(f => f !== field));
                  }
                }}
                className="border-white/10"
              />
              <Label htmlFor={field} className="text-white">{field}</Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default WebhookFieldSelector;