import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initGoogleSheetsAPI, syncWithGoogleSheets, initializeSpreadsheet } from "./utils/googleSheetsSync";
import { MediaItem } from "./types";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSheetsHeaderMapping } from "./GoogleSheetsHeaderMapping";

interface SpreadsheetConfig {
  id: string;
  name: string;
  autoSync: boolean;
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
      autoSync: true
    }] : [];
  });
  const [newSpreadsheetId, setNewSpreadsheetId] = useState("");
  const [newSpreadsheetName, setNewSpreadsheetName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    const syncData = async (spreadsheetId: string) => {
      if (allMedia) {
        try {
          await syncWithGoogleSheets(spreadsheetId, allMedia);
          console.log(`Auto-synced with spreadsheet: ${spreadsheetId}`);
        } catch (error) {
          console.error('Auto-sync error:', error);
        }
      }
    };

    // Set up real-time subscription for media changes
    const channels = spreadsheets
      .filter(sheet => sheet.autoSync)
      .map(sheet => {
        return supabase
          .channel(`media_changes_${sheet.id}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'media' 
          }, async () => {
            await syncData(sheet.id);
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

  const handleAddSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log('Initializing Google Sheets API...');
      await initGoogleSheetsAPI();
      
      console.log('Initializing spreadsheet...');
      await initializeSpreadsheet(newSpreadsheetId);
      
      console.log('Syncing media items...');
      const mediaToSync = selectedMedia.length > 0 ? selectedMedia : allMedia || [];
      await syncWithGoogleSheets(newSpreadsheetId, mediaToSync);
      
      setSpreadsheets(prev => [...prev, {
        id: newSpreadsheetId,
        name: newSpreadsheetName || `Sheet ${prev.length + 1}`,
        autoSync: true
      }]);

      setNewSpreadsheetId("");
      setNewSpreadsheetName("");
      
      toast({
        title: "Success",
        description: `Connected and synced ${mediaToSync.length} media items to Google Sheets`,
      });
      
      onSpreadsheetIdSet(newSpreadsheetId);
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

  return (
    <div className="space-y-6">
      <form onSubmit={handleAddSpreadsheet} className="space-y-4">
        <div className="flex flex-col space-y-2">
          <Label htmlFor="spreadsheetName">Spreadsheet Name</Label>
          <Input
            id="spreadsheetName"
            type="text"
            placeholder="Enter a name for this spreadsheet"
            value={newSpreadsheetName}
            onChange={(e) => setNewSpreadsheetName(e.target.value)}
          />
        </div>
        <div className="flex flex-col space-y-2">
          <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
          <div className="flex items-center gap-4">
            <Input
              id="spreadsheetId"
              type="text"
              placeholder="Enter Google Spreadsheet ID"
              value={newSpreadsheetId}
              onChange={(e) => setNewSpreadsheetId(e.target.value)}
              className="flex-1"
            />
            <Button 
              type="submit" 
              variant="outline"
              disabled={isLoading || !newSpreadsheetId}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Sheet
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      <div className="grid gap-4">
        {spreadsheets.map((sheet) => (
          <Card key={sheet.id}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium">{sheet.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Switch
                    id={`autoSync-${sheet.id}`}
                    checked={sheet.autoSync}
                    onCheckedChange={() => toggleAutoSync(sheet.id)}
                  />
                  <Label htmlFor={`autoSync-${sheet.id}`}>Auto-sync</Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSpreadsheet(sheet.id)}
                  className="text-destructive hover:text-destructive/90"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <GoogleSheetsHeaderMapping
                spreadsheetId={sheet.id}
                onMappingComplete={(mapping) => {
                  console.log('Header mapping:', mapping);
                  localStorage.setItem(`headerMapping-${sheet.id}`, JSON.stringify(mapping));
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};