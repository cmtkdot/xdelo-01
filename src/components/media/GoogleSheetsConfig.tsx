import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { initGoogleSheetsAPI, syncWithGoogleSheets, initializeSpreadsheet } from "./utils/googleSheetsSync";
import { MediaItem } from "./types";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSheetsHeaderMapping } from "./GoogleSheetsHeaderMapping";

interface GoogleSheetsConfigProps {
  onSpreadsheetIdSet: (id: string) => void;
  selectedMedia?: MediaItem[];
}

export const GoogleSheetsConfig = ({ onSpreadsheetIdSet, selectedMedia = [] }: GoogleSheetsConfigProps) => {
  const [spreadsheetId, setSpreadsheetId] = useState("1fItNaUkO73LXPveUeXSwn9e9JZomu6UUtuC58ep_k2w");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Query to fetch all media items
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

  // Effect to sync data when media changes
  useEffect(() => {
    const syncData = async () => {
      if (spreadsheetId && allMedia && isConnected) {
        try {
          await syncWithGoogleSheets(spreadsheetId, allMedia);
        } catch (error) {
          console.error('Auto-sync error:', error);
        }
      }
    };

    // Set up real-time subscription for media changes
    const channel = supabase
      .channel('media_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'media' 
      }, async () => {
        await syncData();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [spreadsheetId, allMedia, isConnected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log('Initializing Google Sheets API...');
      // Initialize Google Sheets API
      await initGoogleSheetsAPI();
      
      console.log('Initializing spreadsheet...');
      // Initialize spreadsheet with headers if needed
      await initializeSpreadsheet(spreadsheetId);
      
      console.log('Syncing media items...');
      // Sync all media items
      const mediaToSync = selectedMedia.length > 0 ? selectedMedia : allMedia || [];
      await syncWithGoogleSheets(spreadsheetId, mediaToSync);
      
      toast({
        title: "Success",
        description: `Connected and synced ${mediaToSync.length} media items to Google Sheets`,
      });
      
      setIsConnected(true);
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

  const handleHeaderMapping = (mapping: Record<string, string>) => {
    console.log('Header mapping:', mapping);
    localStorage.setItem('headerMapping', JSON.stringify(mapping));
  };

  return (
    <div className="space-y-6">
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

      {isConnected && (
        <div className="mt-8">
          <GoogleSheetsHeaderMapping
            spreadsheetId={spreadsheetId}
            onMappingComplete={handleHeaderMapping}
          />
        </div>
      )}
    </div>
  );
};