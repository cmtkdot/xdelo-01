import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SheetConfiguration } from "@/components/google-sheets/SheetConfiguration";
import { checkAuth } from "@/components/ai-chat/AuthHandler";
import { useToast } from "@/components/ui/use-toast";

export default function GoogleSheetSync() {
  const [googleSheetId, setGoogleSheetId] = useState<string | null>(null);
  const [parsedMapping, setParsedMapping] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Check Google auth on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const authStatus = await checkAuth();
      if (authStatus.needsGoogleReauth) {
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
            parsedMapping={parsedMapping}
          />
        </CardContent>
      </Card>
    </div>
  );
}