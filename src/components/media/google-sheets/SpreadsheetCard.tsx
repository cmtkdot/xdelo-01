import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { GoogleSheetsHeaderMapping } from "../GoogleSheetsHeaderMapping";
import { Badge } from "@/components/ui/badge";

interface SpreadsheetConfig {
  id: string;
  name: string;
  autoSync: boolean;
  gid?: string;
}

interface SpreadsheetCardProps {
  sheet: SpreadsheetConfig;
  onToggleAutoSync: (id: string) => void;
  onRemove: (id: string) => void;
}

export const SpreadsheetCard = ({ 
  sheet, 
  onToggleAutoSync, 
  onRemove 
}: SpreadsheetCardProps) => {
  return (
    <Card key={sheet.id}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">{sheet.name}</CardTitle>
          {sheet.gid && (
            <Badge variant="secondary" className="ml-2">
              GID: {sheet.gid}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Switch
              id={`autoSync-${sheet.id}`}
              checked={sheet.autoSync}
              onCheckedChange={() => onToggleAutoSync(sheet.id)}
            />
            <Label htmlFor={`autoSync-${sheet.id}`}>Auto-sync</Label>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(sheet.id)}
            className="text-destructive hover:text-destructive/90"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <GoogleSheetsHeaderMapping
          spreadsheetId={sheet.id}
          sheetGid={sheet.gid}
          onMappingComplete={(mapping) => {
            console.log('Header mapping:', mapping);
            localStorage.setItem(`headerMapping-${sheet.id}`, JSON.stringify(mapping));
          }}
        />
      </CardContent>
    </Card>
  );
};