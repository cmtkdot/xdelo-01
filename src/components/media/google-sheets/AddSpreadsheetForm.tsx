import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";

interface AddSpreadsheetFormProps {
  onSubmit: (name: string, id: string) => Promise<void>;
}

export const AddSpreadsheetForm = ({ onSubmit }: AddSpreadsheetFormProps) => {
  const [newSpreadsheetId, setNewSpreadsheetId] = useState("");
  const [newSpreadsheetName, setNewSpreadsheetName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(newSpreadsheetName, newSpreadsheetId);
      setNewSpreadsheetId("");
      setNewSpreadsheetName("");
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
        <div className="flex items-center gap-4">
          <Input
            id="spreadsheetId"
            type="text"
            placeholder="Enter Google Spreadsheet ID"
            value={newSpreadsheetId}
            onChange={(e) => setNewSpreadsheetId(e.target.value)}
            className="flex-1"
          />
          <Button 
            type="submit" 
            variant="outline"
            disabled={isLoading || !newSpreadsheetId}
            className="gap-2"
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
        </div>
      </div>
    </form>
  );
};