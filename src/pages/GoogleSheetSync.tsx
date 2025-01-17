import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SheetConfiguration } from "@/components/google-sheets/SheetConfiguration";
import { useToast } from "@/components/ui/use-toast";
import { Json } from "@/integrations/supabase/types";

export default function GoogleSheetSync() {
  const [googleSheetId, setGoogleSheetId] = useState<string | null>(null);
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

  // Get existing sheet config and header mapping
  const { data: sheetsConfig } = useQuery({
    queryKey: ['google-sheets-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_sheets_config')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data?.[0]) {
        setGoogleSheetId(data[0].spreadsheet_id);
      }
      return data;
    },
  });

  // Parse the header mapping to ensure it's a Record<string, string>
  const parseHeaderMapping = (mapping: Json | null): Record<string, string> => {
    if (!mapping || typeof mapping !== 'object') {
      return {};
    }
    
    const result: Record<string, string> = {};
    Object.entries(mapping).forEach(([key, value]) => {
      if (typeof value === 'string') {
        result[key] = value;
      }
    });
    return result;
  };

  const headerMapping = parseHeaderMapping(sheetsConfig?.[0]?.header_mapping);

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
            parsedMapping={headerMapping}
            sheetsConfig={sheetsConfig}
          />
        </CardContent>
      </Card>
    </div>
  );
}