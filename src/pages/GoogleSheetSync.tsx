import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";

export default function GoogleSheetSync() {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { data: mediaCount } = useQuery({
    queryKey: ['media-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  const handleSync = async () => {
    if (!spreadsheetId) {
      toast({
        title: "Error",
        description: "Please enter a spreadsheet ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('sheets-operations', {
        body: { 
          action: 'write',
          spreadsheetId,
          data: await formatMediaData()
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Data synced successfully to Google Sheets",
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync data. Please check the logs.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatMediaData = async () => {
    const { data: mediaData, error } = await supabase
      .from('media')
      .select(`
        *,
        chat:channels(title, username)
      `);

    if (error) throw error;

    // Add headers as first row
    const headers = [
      'ID',
      'File Name',
      'Media Type', 
      'Caption',
      'Channel',
      'Created At',
      'Public URL',
      'Google Drive URL'
    ];

    const rows = mediaData.map((item: any) => [
      item.id,
      item.file_name,
      item.media_type,
      item.caption || '',
      item.chat?.title || '',
      item.created_at ? new Date(item.created_at).toLocaleString() : '',
      item.public_url || '',
      item.google_drive_url || ''
    ]);

    return [headers, ...rows];
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Google Sheets Sync
          </CardTitle>
          <CardDescription>
            Sync your media data with Google Sheets using service account authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              You can sync {mediaCount} media items to your Google Sheet. Make sure the sheet is shared with the service account email.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Input
              placeholder="Enter Google Sheet ID"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleSync}
              disabled={isLoading || !spreadsheetId}
              className="gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}