import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { FileSpreadsheet, RefreshCw, AlertCircle } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';

export default function GoogleSheetSync() {
  const [sheetUrl, setSheetUrl] = useState("");
  const { toast } = useToast();

  // Get media count for display
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

  // Extract spreadsheet ID from URL
  const getSpreadsheetId = (url: string) => {
    try {
      const matches = url.match(/[-\w]{25,}/);
      return matches ? matches[0] : null;
    } catch (error) {
      return null;
    }
  };

  // Mutation for syncing with Google Sheets
  const syncMutation = useMutation({
    mutationFn: async ({ spreadsheetId, accessToken }: { spreadsheetId: string, accessToken: string }) => {
      const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
        body: { 
          action: 'init',
          spreadsheetId,
          accessToken
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Sync Started",
        description: "Your media data is being synced with Google Sheets.",
      });
      setSheetUrl("");
    },
    onError: (error) => {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Google Sheets. Please check the URL and try again.",
        variant: "destructive",
      });
    },
  });

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    onSuccess: async (response) => {
      const spreadsheetId = getSpreadsheetId(sheetUrl);
      if (!spreadsheetId) {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid Google Sheets URL.",
          variant: "destructive",
        });
        return;
      }
      syncMutation.mutate({ 
        spreadsheetId,
        accessToken: response.access_token
      });
    },
    onError: (error) => {
      console.error('Google login error:', error);
      toast({
        title: "Authentication Failed",
        description: "Failed to authenticate with Google. Please try again.",
        variant: "destructive",
      });
    },
    flow: 'implicit'
  });

  const handleSync = () => {
    login(); // This will trigger the Google OAuth flow
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card className="bg-black/40 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Google Sheets Sync
          </CardTitle>
          <CardDescription>
            Sync your media data with Google Sheets while preserving custom columns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will sync {mediaCount} media items to your Google Sheet. Custom columns and their values will be preserved.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col space-y-4">
            <div className="space-y-2">
              <label htmlFor="sheetUrl" className="text-sm font-medium">
                Google Sheet URL
              </label>
              <Input
                id="sheetUrl"
                placeholder="Paste your Google Sheet URL here"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="bg-white/5"
              />
            </div>

            <Button
              onClick={handleSync}
              disabled={!sheetUrl || syncMutation.isPending}
              className="w-full"
            >
              {syncMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Start Sync
                </>
              )}
            </Button>
          </div>

          {syncMutation.isSuccess && (
            <Alert>
              <AlertDescription>
                Sync process has started. Your media data will be available in the Google Sheet shortly.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}