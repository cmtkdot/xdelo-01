import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, CheckCircle, ExternalLink } from "lucide-react";
import { GoogleSheetsConfig } from "../media/GoogleSheetsConfig";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface SheetConfigurationProps {
  onSpreadsheetIdSet: (id: string) => void;
  googleSheetId: string | null;
  parsedMapping: Record<string, string>;
}

export const SheetConfiguration = ({ 
  onSpreadsheetIdSet, 
  googleSheetId, 
  parsedMapping 
}: SheetConfigurationProps) => {
  const { data: sheetsConfig, isLoading } = useQuery({
    queryKey: ['google-sheets-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_sheets_config')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getSheetUrl = (sheetId: string, gid?: string) => {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
    return gid ? `${baseUrl}/edit#gid=${gid}` : `${baseUrl}/edit`;
  };

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          Google Sheets Integration
        </CardTitle>
        <CardDescription>
          Connect and manage your Google Sheets integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSheetsConfig
          onSpreadsheetIdSet={(id) => {
            onSpreadsheetIdSet(id);
          }}
          sheetsConfig={sheetsConfig}
        />

        {googleSheetId && (
          <div className="space-y-4">
            <Alert>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <AlertDescription>
                    Connected to Google Sheet
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  onClick={() => window.open(getSheetUrl(googleSheetId), '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Sheet
                </Button>
              </div>
            </Alert>

            {Object.keys(parsedMapping).length > 0 && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-white">Field Mappings</h3>
                  <span className="text-xs text-gray-400">
                    {Object.keys(parsedMapping).length} fields mapped
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(parsedMapping).map(([sheet, db]) => (
                    <div 
                      key={sheet} 
                      className="flex items-center justify-between p-2 rounded bg-white/5"
                    >
                      <span className="text-sm text-white/80">{sheet}</span>
                      <span className="text-sm text-blue-400">→</span>
                      <span className="text-sm text-white/80">{db}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};