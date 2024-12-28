import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleSheetsConfig } from "./google-sheets/hooks/useGoogleSheetsConfig";
import { AddSpreadsheetForm } from "./google-sheets/AddSpreadsheetForm";
import { SpreadsheetCard } from "./google-sheets/SpreadsheetCard";
import { GoogleSheetsConfigProps } from "./google-sheets/types";
import { syncWithGoogleSheets } from "./utils/googleSheetsSync";
import { MediaItem } from "./types";

const SPECIFIC_SPREADSHEET_ID = "1fItNaUkO73LXPveUeXSwn9e9JZomu6UUtuC58ep_k2w";
const SPECIFIC_GID = "584740191";
const SYNC_COLUMNS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export const GoogleSheetsConfig = ({ 
  onSpreadsheetIdSet, 
  selectedMedia = [], 
  googleSheetId,
  sheetsConfig = []
}: GoogleSheetsConfigProps) => {
  const {
    spreadsheets,
    handleAddSpreadsheet,
    toggleAutoSync,
    removeSpreadsheet
  } = useGoogleSheetsConfig(selectedMedia);

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
      
      return (data || []).map(item => ({
        ...item,
        metadata: typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
      })) as MediaItem[];
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
        await syncWithGoogleSheets(spreadsheetId, allMedia, gid, SYNC_COLUMNS);
        console.log(`Auto-synced with spreadsheet: ${spreadsheetId}${gid ? ` (GID: ${gid})` : ''}`);
      } catch (error) {
        console.error('Auto-sync error:', error);
      }
    };

    // Add specific spreadsheet on mount
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
  }, [spreadsheets, allMedia]);

  const handleHeaderMappingComplete = async (spreadsheetId: string, mapping: Record<string, string>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('google_sheets_config')
        .update({ 
          is_headers_mapped: true,
          header_mapping: mapping
        })
        .eq('spreadsheet_id', spreadsheetId)
        .eq('user_id', user.id);

      if (error) throw error;

      const sheet = spreadsheets.find(s => s.id === spreadsheetId);
      if (sheet?.autoSync && allMedia) {
        await syncWithGoogleSheets(spreadsheetId, allMedia, sheet.gid, SYNC_COLUMNS);
      }

      onSpreadsheetIdSet(spreadsheetId);
    } catch (error) {
      console.error('Error completing header mapping:', error);
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