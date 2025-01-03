import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleSheetsConfig } from "./hooks/useGoogleSheetsConfig";
import { AddSpreadsheetForm } from "./AddSpreadsheetForm";
import { SpreadsheetCard } from "./SpreadsheetCard";
import { GoogleSheetsConfigProps } from "./types";
import { SyncManager } from "./SyncManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { useToast } from "@/components/ui/use-toast";

export const GoogleSheetsConfigContent = ({ 
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
      
      const mediaToSync = selectedMedia.length > 0 
        ? data?.filter(item => selectedMedia.includes(item.id))
        : data;
      
      return (mediaToSync || []).map(item => ({
        ...item,
        metadata: typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
      }));
    },
  });

  const isGoogleAuthenticated = () => {
    const token = localStorage.getItem('google_access_token');
    const expiry = localStorage.getItem('google_token_expiry');
    
    if (!token || !expiry) return false;
    
    const expiryTime = parseInt(expiry);
    const currentTime = new Date().getTime();
    
    return currentTime < expiryTime;
  };

  const handleHeaderMappingComplete = async (mapping: Record<string, string>, spreadsheetId: string) => {
    try {
      const { error } = await supabase
        .from('google_sheets_config')
        .insert({ 
          spreadsheet_id: spreadsheetId,
          header_mapping: mapping,
          is_headers_mapped: true,
          user_id: 'public'
        });

      if (error) throw error;

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
    <Card className="w-full bg-background">
      <CardHeader>
        <CardTitle>Google Sheets Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          {!isGoogleAuthenticated() ? (
            <GoogleAuthButton />
          ) : (
            <AddSpreadsheetForm onSubmit={handleAddSpreadsheet} />
          )}
        </div>

        {isGoogleAuthenticated() && (
          <>
            <div className="grid gap-4">
              {spreadsheets.map((sheet) => (
                <SpreadsheetCard
                  key={sheet.id}
                  sheet={sheet}
                  onToggleAutoSync={toggleAutoSync}
                  onRemove={removeSpreadsheet}
                  onHeaderMappingComplete={(mapping) => handleHeaderMappingComplete(mapping, sheet.id)}
                />
              ))}
            </div>

            <SyncManager 
              spreadsheets={spreadsheets}
              allMedia={allMedia}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};