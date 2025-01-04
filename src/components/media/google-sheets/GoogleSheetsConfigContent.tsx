import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleSheetsConfig } from "./hooks/useGoogleSheetsConfig";
import { AddSpreadsheetForm } from "./AddSpreadsheetForm";
import { SpreadsheetCard } from "./SpreadsheetCard";
import { GoogleSheetsConfigProps } from "./types";
import { SyncManager } from "./SyncManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { MediaItem } from "../types";
import { GoogleAuthButton } from "./GoogleAuthButton";

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

  // Check if user is authenticated with Google
  const isGoogleAuthenticated = !!localStorage.getItem('google_access_token');

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
      
      return mediaToSync?.map(item => ({
        ...item,
        metadata: typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata,
        additional_data: typeof item.additional_data === 'string' ? JSON.parse(item.additional_data) : item.additional_data
      })) as MediaItem[];
    },
  });

  return (
    <Card className="w-full bg-background">
      <CardHeader>
        <CardTitle>Google Sheets Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isGoogleAuthenticated ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <p className="text-center text-gray-500 dark:text-gray-400">
              Please authenticate with Google to access Google Sheets functionality
            </p>
            <GoogleAuthButton />
          </div>
        ) : (
          <>
            <AddSpreadsheetForm onSubmit={handleAddSpreadsheet} />
            
            <div className="grid gap-4">
              {spreadsheets.map((sheet) => (
                <SpreadsheetCard
                  key={sheet.id}
                  sheet={sheet}
                  onToggleAutoSync={toggleAutoSync}
                  onRemove={removeSpreadsheet}
                  onHeaderMappingComplete={(mapping) => {
                    try {
                      onSpreadsheetIdSet(sheet.id);
                      toast({
                        title: "Success",
                        description: "Header mapping completed successfully",
                      });
                    } catch (error) {
                      console.error('Error completing header mapping:', error);
                      toast({
                        title: "Error",
                        description: "Failed to complete header mapping",
                        variant: "destructive",
                      });
                    }
                  }}
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