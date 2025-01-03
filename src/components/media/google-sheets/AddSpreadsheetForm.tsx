import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleSheetsHeaderMapping } from "../GoogleSheetsHeaderMapping";

interface AddSpreadsheetFormProps {
  onSubmit: (name: string, id: string, gid?: string) => Promise<void>;
}

export const AddSpreadsheetForm = ({ onSubmit }: AddSpreadsheetFormProps) => {
  const [newSpreadsheetId, setNewSpreadsheetId] = useState("");
  const [newSpreadsheetName, setNewSpreadsheetName] = useState("");
  const [sheetGid, setSheetGid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [isSheetAdded, setIsSheetAdded] = useState(false);

  const parseGoogleSheetUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes('docs.google.com')) return null;

      const pathParts = urlObj.pathname.split('/');
      const spreadsheetId = pathParts[pathParts.indexOf('d') + 1];
      
      // Extract GID from URL hash or search params
      let gid = '';
      if (urlObj.hash && urlObj.hash.includes('gid=')) {
        gid = urlObj.hash.split('gid=')[1];
      } else if (urlObj.searchParams.get('gid')) {
        gid = urlObj.searchParams.get('gid') || '';
      }

      // Try to extract name from the URL
      const nameFromUrl = urlObj.pathname.split('/').pop() || 'Google Sheet';
      
      return { spreadsheetId, gid, name: nameFromUrl };
    } catch (error) {
      console.error('Error parsing Google Sheet URL:', error);
      return null;
    }
  };

  useEffect(() => {
    if (sheetUrl) {
      const parsed = parseGoogleSheetUrl(sheetUrl);
      if (parsed) {
        setNewSpreadsheetId(parsed.spreadsheetId);
        setSheetGid(parsed.gid);
        if (!newSpreadsheetName) {
          setNewSpreadsheetName(parsed.name);
        }
      }
    }
  }, [sheetUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(newSpreadsheetName, newSpreadsheetId, sheetGid || undefined);
      setIsSheetAdded(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingComplete = () => {
    // Reset form after mapping is complete
    setNewSpreadsheetId("");
    setNewSpreadsheetName("");
    setSheetGid("");
    setSheetUrl("");
    setIsSheetAdded(false);
  };

  if (isSheetAdded && newSpreadsheetId) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Sheet added successfully! Please configure the header mapping below.
          </AlertDescription>
        </Alert>
        <GoogleSheetsHeaderMapping
          spreadsheetId={newSpreadsheetId}
          sheetGid={sheetGid}
          onMappingComplete={(mapping) => {
            handleMappingComplete();
          }}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col space-y-2">
        <Label htmlFor="sheetUrl">Google Sheet URL</Label>
        <Input
          id="sheetUrl"
          type="text"
          placeholder="Paste Google Sheet URL here"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
        />
      </div>
      
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