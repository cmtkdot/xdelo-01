import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface HeaderMappingActionsProps {
  onSave: () => void;
  onSelectAll: () => void;
}

export const HeaderMappingActions = ({ onSave, onSelectAll }: HeaderMappingActionsProps) => {
  return (
    <div className="space-y-2">
      <Button 
        onClick={onSelectAll}
        className="w-full mb-2"
        variant="secondary"
      >
        Map All Headers
      </Button>
      <Button 
        onClick={onSave}
        className="w-full"
        variant="outline"
      >
        <Save className="mr-2 h-4 w-4" />
        Save Mapping
      </Button>
    </div>
  );
};