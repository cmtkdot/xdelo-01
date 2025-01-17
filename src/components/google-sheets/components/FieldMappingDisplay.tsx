import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface FieldMappingDisplayProps {
  parsedMapping: Record<string, string>;
}

export const FieldMappingDisplay = ({ parsedMapping }: FieldMappingDisplayProps) => {
  if (Object.keys(parsedMapping).length === 0) {
    return (
      <Alert variant="warning">
        <AlertTriangle className="h-5 w-5" />
        <AlertDescription>
          No field mappings configured. Please set up field mappings to enable synchronization.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Field Mappings</h3>
        <span className="text-xs text-gray-400">
          {Object.keys(parsedMapping).length} fields mapped
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(parsedMapping).map(([sheet, db]) => (
          <div 
            key={sheet} 
            className="flex items-center justify-between p-2 rounded bg-white/5"
          >
            <span className="text-sm text-white/80">{sheet}</span>
            <span className="text-sm text-blue-400">→</span>
            <span className="text-sm text-white/80">{db}</span>
          </div>
        ))}
      </div>
    </div>
  );
};