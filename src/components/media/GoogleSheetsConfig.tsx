import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleSheetsConfig } from "./google-sheets/hooks/useGoogleSheetsConfig";
import { AddSpreadsheetForm } from "./google-sheets/AddSpreadsheetForm";
import { SpreadsheetCard } from "./google-sheets/SpreadsheetCard";
import { GoogleSheetsConfigProps } from "./google-sheets/types";
import { syncWithGoogleSheets } from "./utils/googleSheetsSync";
import { MediaItem } from "./types";
import { useToast } from "@/components/ui/use-toast";
import { useGoogleLogin } from '@react-oauth/google';

export const GoogleSheetsConfig = ({ 
  onSpreadsheetIdSet, 
  selectedMedia = [], 
  googleSheetId,
  sheetsConfig = []
}: GoogleSheetsConfigProps) => {
  const { toast } = useToast();
  const {
    spreadsheets,
    handleAddSpreadsheet,
    toggleAutoSync,
    removeSpreadsheet
  } = useGoogleSheetsConfig(selectedMedia);

  const login = useGoogleLogin({
    onSuccess: (response) => {
      localStorage.setItem('google_access_token', response.access_token);
      toast({
        title: "Success",
        description: "Successfully authenticated with Google",
      });
    },
    onError: (error) => {
      console.error('Google Login Error:', error);
      toast({
        title: "Error",
        description: "Failed to authenticate with Google",
        variant: "destructive",
      });
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  });

  // Query to fetch all media or selected media
  const { data: allMedia } = useQuery({
    queryKey: ['all-media', selectedMedia.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select(`
          *,
          chat:channels(title, username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // If there are selected media items, only sync those
      const mediaToSync = selectedMedia.length > 0 
        ? data?.filter(item => selectedMedia.includes(item.id))
        : data;
      
      return (mediaToSync || []).map(item => ({
        ...item,
        metadata: typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
      })) as MediaItem[];
    },
  });

  // Function to perform sync
  const performSync = async (spreadsheetId: string, gid?: string) => {
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
      console.log(`Synced with spreadsheet: ${spreadsheetId}${gid ? ` (GID: ${gid})` : ''}`);
      toast({
        title: "Sync Successful",
        description: "Media data has been synchronized with Google Sheets",
      });
    } catch (error) {
      console.error('Sync error:', error);
      if (error.message?.includes('No access token found')) {
        toast({
          title: "Authentication Required",
          description: "Please authenticate with Google to sync data",
          action: <button onClick={() => login()} className="bg-primary text-white px-4 py-2 rounded">Login</button>,
        });
      } else {
        toast({
          title: "Sync Failed",
          description: error instanceof Error ? error.message : "Failed to sync with Google Sheets",
          variant: "destructive",
        });
      }
    }
  };

  // Set up automatic sync interval
  useEffect(() => {
    // Add specific spreadsheet on mount if not already configured
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

    // Set up interval for auto-sync
    const syncInterval = setInterval(() => {
      spreadsheets.forEach(sheet => {
        if (sheet.autoSync && sheet.isHeadersMapped) {
          performSync(sheet.id, sheet.gid);
        }
      });
    }, SYNC_INTERVAL);

    // Set up real-time sync on media changes
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
            await performSync(sheet.id, sheet.gid);
          })
          .subscribe();
      });

    return () => {
      clearInterval(syncInterval);
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

      // Perform initial sync after mapping is complete
      const sheet = spreadsheets.find(s => s.id === spreadsheetId);
      if (sheet?.autoSync && allMedia) {
        await performSync(spreadsheetId, sheet.gid);
      }

      toast({
        title: "Success",
        description: "Header mapping completed and initial sync performed",
      });

      onSpreadsheetIdSet(spreadsheetId);
    } catch (error) {
      console.error('Error completing header mapping:', error);
      toast({
        title: "Error",
        description: "Failed to complete header mapping",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AddSpreadsheetForm onSubmit={handleAddSpreadsheet} />
        <button
          onClick={() => login()}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors"
        >
          Connect Google Account
        </button>
      </div>

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
