import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { GoogleAuthButton } from "@/components/media/google-sheets/GoogleAuthButton";
import { getGoogleAuthMethod } from "@/components/media/utils/googleSheets/authManager";

// Helper function to extract spreadsheet ID from URL
const extractSpreadsheetId = (url: string): string | null => {
  try {
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/edit/,
      /^([a-zA-Z0-9-_]+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting spreadsheet ID:', error);
    return null;
  }
};

export default function GoogleSheetSync() {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [authMethod, setAuthMethod] = useState<'oauth' | 'service_account' | null>(null);

  // Fetch auth method on component mount
  useQuery({
    queryKey: ['google-auth-method'],
    queryFn: async () => {
      const method = await getGoogleAuthMethod();
      setAuthMethod(method);
      return method;
    },
  });

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
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    
    if (!spreadsheetId) {
      toast({
        title: "Error",
        description: "Please enter a valid Google Sheets URL",
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
            Sync your media data with Google Sheets using {authMethod === 'oauth' ? 'OAuth' : 'service account'} authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              You can sync {mediaCount} media items to your Google Sheet. 
              {authMethod === 'service_account' && " Make sure the sheet is shared with the service account email."}
            </AlertDescription>
          </Alert>

          {authMethod === 'oauth' && !localStorage.getItem('google_access_token') && (
            <GoogleAuthButton />
          )}

          <div className="flex gap-4">
            <Input
              placeholder="Enter Google Sheet URL"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleSync}
              disabled={isLoading || !spreadsheetUrl || (authMethod === 'oauth' && !localStorage.getItem('google_access_token'))}
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