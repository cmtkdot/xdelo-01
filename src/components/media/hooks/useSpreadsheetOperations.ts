import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SpreadsheetConfig } from '../types/googleSheets';
import { MediaItem } from '../types';
import { useGoogleSheetsAuth } from './useGoogleSheetsAuth';

export const useSpreadsheetOperations = (
  onSpreadsheetIdSet: (id: string) => void,
  allMedia?: MediaItem[]
) => {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetConfig[]>([]);
  const { isInitialized, initializeGoogleSheetsAPI } = useGoogleSheetsAuth();
  const { toast } = useToast();

  const loadSpreadsheets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('google_sheets_config')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        setSpreadsheets(data.map(config => ({
          id: config.spreadsheet_id,
          name: config.sheet_name || `Sheet ${config.id}`,
          autoSync: config.auto_sync || false,
          gid: config.sheet_gid,
          isHeadersMapped: config.is_headers_mapped
        })));
      }
    } catch (error) {
      console.error('Error loading spreadsheets:', error);
      toast({
        title: "Error",
        description: "Failed to load spreadsheet configurations",
        variant: "destructive",
      });
    }
  };

  const initializeSpreadsheet = async (spreadsheetId: string, gid?: string) => {
    try {
      if (!window.gapi?.client?.sheets) {
        await initializeGoogleSheetsAPI();
      }

      const response = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
      });

      if (!response.result) {
        throw new Error('Failed to access spreadsheet');
      }

      if (gid) {
        const sheet = response.result.sheets?.find(
          (s: any) => s.properties?.sheetId === parseInt(gid)
        );
        
        if (!sheet) {
          throw new Error(`Sheet with GID ${gid} not found`);
        }
      }

      return true;
    } catch (error) {
      console.error('Error initializing spreadsheet:', error);
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const handleAddSpreadsheet = async (name: string, id: string, gid?: string) => {
    try {
      if (!isInitialized) {
        await initializeGoogleSheetsAPI();
      }
      
      await initializeSpreadsheet(id, gid);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please sign in to continue",
          variant: "destructive",
        });
        return;
      }
      
      // Check if configuration already exists
      const { data: existingConfig } = await supabase
        .from('google_sheets_config')
        .select('*')
        .eq('user_id', user.id)
        .eq('spreadsheet_id', id)
        .eq('sheet_gid', gid || '')
        .single();

      if (existingConfig) {
        toast({
          title: "Info",
          description: "This sheet is already configured",
        });
        return;
      }
      
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
      
      onSpreadsheetIdSet(id);
    } catch (error) {
      console.error('Google Sheets sync error:', error);
      toast({
        title: "Error",
        description: "Failed to configure Google Sheets integration. Please try again.",
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
    removeSpreadsheet,
    loadSpreadsheets,
  };
};
