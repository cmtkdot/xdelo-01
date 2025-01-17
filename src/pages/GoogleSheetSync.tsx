import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
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

      if (error) throw error;

      toast({
        title: "Success",
        description: "Data synced successfully",
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Error",
        description: "Failed to sync data. Please check the logs.",
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

    return mediaData.map((item: any) => [
      item.id,
      item.file_name,
      item.media_type,
      item.caption || '',
      item.chat?.title || '',
      item.created_at ? new Date(item.created_at).toLocaleString() : '',
      item.public_url || ''
    ]);
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
            Sync your media data with Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              You can sync {mediaCount} media items with your Google Sheet.
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