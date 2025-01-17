import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSpreadsheet, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SheetConfiguration } from "@/components/google-sheets/SheetConfiguration";
import { checkAuth } from "@/components/ai-chat/AuthHandler";
import { useToast } from "@/components/ui/use-toast";
import { GoogleAuthButton } from "@/components/media/google-sheets/GoogleAuthButton";

export default function GoogleSheetSync() {
  const [googleSheetId, setGoogleSheetId] = useState<string | null>(null);
  const [needsGoogleAuth, setNeedsGoogleAuth] = useState(false);
  const { toast } = useToast();

  // Check Google auth on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const authStatus = await checkAuth();
      if (authStatus.needsGoogleReauth) {
        setNeedsGoogleAuth(true);
        toast({
          title: "Authentication Required",
          description: "Please authenticate with Google to continue.",
          variant: "destructive",
        });
      }
    };

    verifyAuth();
  }, []);

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

  // Get existing sheet config
  const { data: sheetsConfig } = useQuery({
    queryKey: ['google-sheets-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_sheets_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      if (data?.[0]) {
        setGoogleSheetId(data[0].spreadsheet_id);
      }
      return data;
    },
  });

  if (needsGoogleAuth) {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              Google Authentication Required
            </CardTitle>
            <CardDescription>
              Please authenticate with Google to use Sheets integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your Google authentication has expired. Please re-authenticate to continue using Google Sheets integration.
              </AlertDescription>
            </Alert>
            <GoogleAuthButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card className="bg-black/40 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Google Sheets Integration
          </CardTitle>
          <CardDescription>
            Connect and sync your media data with Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              You can sync {mediaCount} media items with your Google Sheet. The sync will preserve custom columns and their values.
            </AlertDescription>
          </Alert>

          <SheetConfiguration
            onSpreadsheetIdSet={setGoogleSheetId}
            googleSheetId={googleSheetId}
            sheetsConfig={sheetsConfig}
          />
        </CardContent>
      </Card>
    </div>
  );
}