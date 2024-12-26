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
  parsedMapping?: Record<string, string>;
}

export const GoogleSheetsConfig = ({ 
  onSpreadsheetIdSet, 
  selectedMedia = [], 
  googleSheetId,
  parsedMapping = {}
}: GoogleSheetsConfigProps) => {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetConfig[]>(() => {
    const saved = localStorage.getItem('spreadsheets');
    return saved ? JSON.parse(saved) : googleSheetId ? [{
      id: googleSheetId,
      name: 'Default Sheet',
      autoSync: true,
      isHeadersMapped: false
    }] : [];
  });
  
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

  useEffect(() => {
    const syncData = async (spreadsheetId: string, gid?: string) => {
      const sheet = spreadsheets.find(s => s.id === spreadsheetId);
      if (!sheet?.isHeadersMapped || !allMedia) return;

      try {
        await syncWithGoogleSheets(spreadsheetId, allMedia, gid);
        console.log(`Auto-synced with spreadsheet: ${spreadsheetId}${gid ? ` (GID: ${gid})` : ''}`);
      } catch (error) {
        console.error('Auto-sync error:', error);
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
  }, [spreadsheets, allMedia]);

  useEffect(() => {
    localStorage.setItem('spreadsheets', JSON.stringify(spreadsheets));
  }, [spreadsheets]);

  const handleAddSpreadsheet = async (name: string, id: string, gid?: string) => {
    try {
      console.log('Initializing Google Sheets API...');
      await initGoogleSheetsAPI();
      
      console.log('Initializing spreadsheet...');
      await initializeSpreadsheet(id, gid);
      
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

  const toggleAutoSync = (spreadsheetId: string) => {
    setSpreadsheets(prev => prev.map(sheet => 
      sheet.id === spreadsheetId 
        ? { ...sheet, autoSync: !sheet.autoSync }
        : sheet
    ));
  };

  const removeSpreadsheet = (spreadsheetId: string) => {
    setSpreadsheets(prev => prev.filter(sheet => sheet.id !== spreadsheetId));
  };

  const handleHeaderMappingComplete = (spreadsheetId: string, mapping: Record<string, string>) => {
    setSpreadsheets(prev => prev.map(sheet => 
      sheet.id === spreadsheetId 
        ? { ...sheet, isHeadersMapped: true }
        : sheet
    ));

    // Only sync after headers are mapped
    if (allMedia) {
      const sheet = spreadsheets.find(s => s.id === spreadsheetId);
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