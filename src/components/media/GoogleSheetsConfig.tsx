import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { initGoogleSheetsAPI } from "./utils/googleSheetsSync";

interface GoogleSheetsConfigProps {
  onSpreadsheetIdSet: (id: string) => void;
}

export const GoogleSheetsConfig = ({ onSpreadsheetIdSet }: GoogleSheetsConfigProps) => {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await initGoogleSheetsAPI();
      onSpreadsheetIdSet(spreadsheetId);
      toast({
        title: "Success",
        description: "Google Sheets integration configured successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to configure Google Sheets integration",
        variant: "destructive",
      });
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
      <Button type="submit" variant="outline">
        Connect Spreadsheet
      </Button>
    </form>
  );
};