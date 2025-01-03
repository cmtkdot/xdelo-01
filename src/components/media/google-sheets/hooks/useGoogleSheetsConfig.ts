import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SpreadsheetConfig } from "../types";
import { 
  initGoogleSheetsAPI, 
  initializeSpreadsheet,
  SPECIFIC_SPREADSHEET_ID,
  SPECIFIC_GID 
} from "../../utils/googleSheetsSync";

export const useGoogleSheetsConfig = (selectedMedia = []) => {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetConfig[]>([]);
  const { toast } = useToast();

  // Add specific spreadsheet on mount
  useEffect(() => {
    const isConfigured = spreadsheets.some(sheet => 
      sheet.id === SPECIFIC_SPREADSHEET_ID && sheet.gid === SPECIFIC_GID
    );

    if (!isConfigured) {
      handleAddSpreadsheet(
        "Synced Media Sheet",
        SPECIFIC_SPREADSHEET_ID,
        SPECIFIC_GID
      );
    }
  }, []);

  const handleAddSpreadsheet = async (name: string, id: string, gid?: string) => {
    try {
      await initGoogleSheetsAPI();
      await initializeSpreadsheet(id, gid);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // First, check if configuration already exists
      const { data: existingConfig, error: fetchError } = await supabase
        .from('google_sheets_config')
        .select('*')
        .eq('user_id', user.id)
        .eq('spreadsheet_id', id)
        .eq('sheet_gid', gid || '')
        .maybeSingle();

      if (fetchError) throw fetchError;

      let configData;
      
      if (existingConfig) {
        // Update existing configuration
        const { data, error } = await supabase
          .from('google_sheets_config')
          .update({
            sheet_name: name,
            auto_sync: true,
            is_headers_mapped: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id)
          .select()
          .single();

        if (error) throw error;
        configData = data;
        
        toast({
          title: "Configuration Updated",
          description: "Existing Google Sheets configuration has been updated.",
        });
      } else {
        // Insert new configuration
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
        configData = data;
        
        toast({
          title: "Success",
          description: "Connected to Google Sheets. Please map the headers before syncing.",
        });
      }
      
      setSpreadsheets(prev => {
        const newSheet = {
          id,
          name: name || `Sheet ${prev.length + 1}`,
          autoSync: true,
          gid,
          isHeadersMapped: false
        };
        
        // Replace if exists, otherwise add
        const exists = prev.findIndex(s => s.id === id && s.gid === gid) !== -1;
        return exists 
          ? prev.map(s => (s.id === id && s.gid === gid) ? newSheet : s)
          : [...prev, newSheet];
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