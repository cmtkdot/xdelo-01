import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AddSpreadsheetFormProps {
  onSubmit: (name: string, id: string, gid?: string) => Promise<void>;
}

export const AddSpreadsheetForm = ({ onSubmit }: AddSpreadsheetFormProps) => {
  const [newSpreadsheetId, setNewSpreadsheetId] = useState("");
  const [newSpreadsheetName, setNewSpreadsheetName] = useState("");
  const [sheetGid, setSheetGid] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(newSpreadsheetName, newSpreadsheetId, sheetGid || undefined);
      setNewSpreadsheetId("");
      setNewSpreadsheetName("");
      setSheetGid("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col space-y-2">
        <Label htmlFor="spreadsheetName">Spreadsheet Name</Label>
        <Input
          id="spreadsheetName"
          type="text"
          placeholder="Enter a name for this spreadsheet"
          value={newSpreadsheetName}
          onChange={(e) => setNewSpreadsheetName(e.target.value)}
        />
      </div>
      <div className="flex flex-col space-y-2">
        <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
        <Input
          id="spreadsheetId"
          type="text"
          placeholder="Enter Google Spreadsheet ID"
          value={newSpreadsheetId}
          onChange={(e) => setNewSpreadsheetId(e.target.value)}
        />
      </div>
      <div className="flex flex-col space-y-2">
        <Label htmlFor="sheetGid">Sheet GID (Optional)</Label>
        <Input
          id="sheetGid"
          type="text"
          placeholder="Enter Sheet GID (leave empty for first sheet)"
          value={sheetGid}
          onChange={(e) => setSheetGid(e.target.value)}
        />
        <AlertDescription className="text-xs text-muted-foreground">
          The GID can be found in the sheet's URL after 'gid='. If not provided, the first sheet will be used.
        </AlertDescription>
      </div>
      <Button 
        type="submit" 
        variant="outline"
        disabled={isLoading || !newSpreadsheetId || !newSpreadsheetName}
        className="w-full gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Add Sheet
          </>
        )}
      </Button>
    </form>
  );
};