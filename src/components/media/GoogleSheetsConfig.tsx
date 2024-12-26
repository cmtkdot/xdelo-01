import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddSpreadsheetForm } from "./google-sheets/AddSpreadsheetForm";
import { SpreadsheetCard } from "./google-sheets/SpreadsheetCard";
import { useSpreadsheetOperations } from "./hooks/useSpreadsheetOperations";
import { GoogleSheetsConfigProps } from "./types/googleSheets";
import { MediaItem } from "./types";
import { syncWithGoogleSheets } from "./utils/googleSheetsSync";
import { useToast } from "@/components/ui/use-toast";

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
    removeSpreadsheet,
  } = useSpreadsheetOperations(onSpreadsheetIdSet);
  const { toast } = useToast();

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

      // Update local state and trigger sync if needed
      const sheet = spreadsheets.find(s => s.id === spreadsheetId);
      if (sheet?.autoSync && allMedia) {
        await syncWithGoogleSheets(spreadsheetId, allMedia, sheet?.gid);
        toast({
          title: "Success",
          description: "Initial sync completed successfully",
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