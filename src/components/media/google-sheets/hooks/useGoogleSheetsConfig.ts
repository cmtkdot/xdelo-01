import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SpreadsheetConfig } from "../types";
import { initGoogleSheetsAPI, syncWithGoogleSheets, initializeSpreadsheet } from "../../utils/googleSheetsSync";

export const useGoogleSheetsConfig = (selectedMedia = []) => {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetConfig[]>([]);
  const { toast } = useToast();

  // Add specific spreadsheet on mount
  useEffect(() => {
    const specificSpreadsheetId = "1fItNaUkO73LXPveUeXSwn9e9JZomu6UUtuC58ep_k2w";
    const specificGid = "1908422891";
    
    const isConfigured = spreadsheets.some(sheet => 
      sheet.id === specificSpreadsheetId && sheet.gid === specificGid
    );

    if (!isConfigured) {
      handleAddSpreadsheet(
        "Synced Media Sheet",
        specificSpreadsheetId,
        specificGid
      );
    }
  }, []);

  const handleAddSpreadsheet = async (name: string, id: string, gid?: string) => {
    try {
      await initGoogleSheetsAPI();
      await initializeSpreadsheet(id, gid);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('google_sheets_config')
        .insert({
          user_id: user.id,
          spreadsheet_id: id,
          sheet_name: name,
          sheet_gid: gid,
          auto_sync: true,
          is_headers_mapped: false
        })
        .select()
        .single();

      if (error) throw error;
      
      setSpreadsheets(prev => [...prev, {
        id,
        name: name || `Sheet ${prev.length + 1}`,
        autoSync: true,
        gid,
        isHeadersMapped: false
      }]);
      
      toast({
        title: "Success",
        description: "Connected to Google Sheets. Please map the headers before syncing.",
      });
    } catch (error) {
      console.error('Google Sheets sync error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to configure Google Sheets integration",
        variant: "destructive",
      });
    }
  };

  const toggleAutoSync = async (spreadsheetId: string) => {
    const sheet = spreadsheets.find(s => s.id === spreadsheetId);
    if (!sheet) return;

    try {
      const { error } = await supabase
        .from('google_sheets_config')
        .update({ auto_sync: !sheet.autoSync })
        .eq('spreadsheet_id', spreadsheetId);

      if (error) throw error;

      setSpreadsheets(prev => prev.map(sheet => 
        sheet.id === spreadsheetId 
          ? { ...sheet, autoSync: !sheet.autoSync }
          : sheet
      ));
    } catch (error) {
      console.error('Error toggling auto-sync:', error);
      toast({
        title: "Error",
        description: "Failed to update auto-sync setting",
        variant: "destructive",
      });
    }
  };

  const removeSpreadsheet = async (spreadsheetId: string) => {
    try {
      const { error } = await supabase
        .from('google_sheets_config')
        .delete()
        .eq('spreadsheet_id', spreadsheetId);

      if (error) throw error;

      setSpreadsheets(prev => prev.filter(sheet => sheet.id !== spreadsheetId));
      
      toast({
        title: "Success",
        description: "Sheet configuration removed successfully",
      });
    } catch (error) {
      console.error('Error removing sheet:', error);
      toast({
        title: "Error",
        description: "Failed to remove sheet configuration",
        variant: "destructive",
      });
    }
  };

  return {
    spreadsheets,
    handleAddSpreadsheet,
    toggleAutoSync,
    removeSpreadsheet
  };
};