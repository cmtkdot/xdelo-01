import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { initGoogleSheetsAPI, syncWithGoogleSheets } from "./utils/googleSheetsSync";
import { MediaItem } from "./types";
import { Loader2 } from "lucide-react";

interface GoogleSheetsConfigProps {
  onSpreadsheetIdSet: (id: string) => void;
  selectedMedia?: MediaItem[];
}

export const GoogleSheetsConfig = ({ onSpreadsheetIdSet, selectedMedia = [] }: GoogleSheetsConfigProps) => {
  const [spreadsheetId, setSpreadsheetId] = useState("1fItNaUkO73LXPveUeXSwn9e9JZomu6UUtuC58ep_k2w");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Initialize Google Sheets API
      await initGoogleSheetsAPI();
      
      // If there are selected media items, sync them
      if (selectedMedia.length > 0) {
        await syncWithGoogleSheets(spreadsheetId, selectedMedia);
        toast({
          title: "Success",
          description: `Synced ${selectedMedia.length} media items to Google Sheets`,
        });
      }
      
      onSpreadsheetIdSet(spreadsheetId);
    } catch (error) {
      console.error('Google Sheets sync error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to configure Google Sheets integration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4">
      <Input
        type="text"
        placeholder="Enter Google Spreadsheet ID"
        value={spreadsheetId}
        onChange={(e) => setSpreadsheetId(e.target.value)}
        className="max-w-sm"
      />
      <Button 
        type="submit" 
        variant="outline"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          "Connect Spreadsheet"
        )}
      </Button>
    </form>
  );
};