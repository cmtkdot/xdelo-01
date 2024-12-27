import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { initGoogleSheetsAPI, syncWithGoogleSheets, initializeSpreadsheet } from "./utils/googleSheetsSync";
import { MediaItem } from "./types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddSpreadsheetForm } from "./google-sheets/AddSpreadsheetForm";
import { SpreadsheetCard } from "./google-sheets/SpreadsheetCard";

interface SpreadsheetConfig {
  id: string;
  name: string;
  autoSync: boolean;
  gid?: string;
  isHeadersMapped?: boolean;
}

interface GoogleSheetsConfigProps {
  onSpreadsheetIdSet: (id: string) => void;
  selectedMedia?: MediaItem[];
  googleSheetId?: string | null;
  sheetsConfig?: any[];
}

export const GoogleSheetsConfig = ({ 
  onSpreadsheetIdSet, 
  selectedMedia = [], 
  googleSheetId,
  sheetsConfig = []
}: GoogleSheetsConfigProps) => {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetConfig[]>(() => {
    return sheetsConfig.map(config => ({
      id: config.spreadsheet_id,
      name: config.sheet_name || 'Unnamed Sheet',
      autoSync: config.auto_sync,
      gid: config.sheet_gid,
      isHeadersMapped: config.is_headers_mapped
    }));
  });
  
  const { toast } = useToast();

  // Add the specific spreadsheet ID and GID you want to sync
  useEffect(() => {
    const specificSpreadsheetId = "1fItNaUkO73LXPveUeXSwn9e9JZomu6UUtuC58ep_k2w";
    const specificGid = "1908422891";
    
    // Check if this sheet is already configured
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

  const { data: allMedia } = useQuery({
    queryKey: ['all-media'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select(`
          *,
          chat:channels(title, username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MediaItem[];
    },
  });

  useEffect(() => {
    const syncData = async (spreadsheetId: string, gid?: string) => {
      const sheet = spreadsheets.find(s => s.id === spreadsheetId);
      if (!sheet?.isHeadersMapped || !sheet.autoSync || !allMedia) {
        console.log('Skipping sync - conditions not met:', {
          isHeadersMapped: sheet?.isHeadersMapped,
          autoSync: sheet?.autoSync,
          hasMedia: Boolean(allMedia)
        });
        return;
      }

      try {
        await syncWithGoogleSheets(spreadsheetId, allMedia, gid);
        console.log(`Auto-synced with spreadsheet: ${spreadsheetId}${gid ? ` (GID: ${gid})` : ''}`);
      } catch (error) {
        console.error('Auto-sync error:', error);
        toast({
          title: "Sync Error",
          description: "Failed to sync with Google Sheets. Please ensure headers are mapped correctly.",
          variant: "destructive",
        });
      }
    };

    const channels = spreadsheets
      .filter(sheet => sheet.autoSync && sheet.isHeadersMapped)
      .map(sheet => {
        return supabase
          .channel(`media_changes_${sheet.id}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'media' 
          }, async () => {
            await syncData(sheet.id, sheet.gid);
          })
          .subscribe();
      });

    return () => {
      channels.forEach(channel => channel.unsubscribe());
    };
  }, [spreadsheets, allMedia, toast]);

  const handleAddSpreadsheet = async (name: string, id: string, gid?: string) => {
    try {
      console.log('Initializing Google Sheets API...');
      await initGoogleSheetsAPI();
      
      console.log('Initializing spreadsheet...');
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
      
      onSpreadsheetIdSet(id);
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

  const handleHeaderMappingComplete = async (spreadsheetId: string, mapping: Record<string, string>) => {
    try {
      const { error } = await supabase
        .from('google_sheets_config')
        .update({ 
          is_headers_mapped: true,
          header_mapping: mapping
        })
        .eq('spreadsheet_id', spreadsheetId);

      if (error) throw error;

      setSpreadsheets(prev => prev.map(sheet => 
        sheet.id === spreadsheetId 
          ? { ...sheet, isHeadersMapped: true }
          : sheet
      ));

      // Only sync after headers are mapped and if autoSync is enabled
      const sheet = spreadsheets.find(s => s.id === spreadsheetId);
      if (sheet?.autoSync && allMedia) {
        syncWithGoogleSheets(spreadsheetId, allMedia, sheet?.gid)
          .then(() => {
            toast({
              title: "Success",
              description: "Initial sync completed successfully",
            });
          })
          .catch((error) => {
            console.error('Sync error:', error);
            toast({
              title: "Error",
              description: "Failed to sync with Google Sheets",
              variant: "destructive",
            });
          });
      }
    } catch (error) {
      console.error('Error updating header mapping:', error);
      toast({
        title: "Error",
        description: "Failed to save header mapping",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <AddSpreadsheetForm onSubmit={handleAddSpreadsheet} />

      <div className="grid gap-4">
        {spreadsheets.map((sheet) => (
          <SpreadsheetCard
            key={sheet.id}
            sheet={sheet}
            onToggleAutoSync={toggleAutoSync}
            onRemove={removeSpreadsheet}
            onHeaderMappingComplete={handleHeaderMappingComplete}
          />
        ))}
      </div>
    </div>
  );
};