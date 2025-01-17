import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, CheckCircle, ExternalLink, AlertTriangle } from "lucide-react";
import { GoogleSheetsConfig } from "../media/GoogleSheetsConfig";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SheetDataDisplay } from "./SheetDataDisplay";
import { useToast } from "@/components/ui/use-toast";
import { checkGoogleTokenStatus } from "../ai-chat/AuthHandler";
import { GoogleAuthButton } from "../media/google-sheets/GoogleAuthButton";

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
  const { toast } = useToast();
  
  const { data: sheetsConfig, isLoading: isConfigLoading } = useQuery({
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

  const { data: sheetData, isLoading: isDataLoading, refetch } = useQuery({
    queryKey: ['sheet-data', googleSheetId],
    queryFn: async () => {
      if (!googleSheetId) return [];
      
      // Check Google token status before making the request
      const tokenStatus = checkGoogleTokenStatus();
      if (!tokenStatus.isValid) {
        throw new Error(`Google authentication required: ${tokenStatus.reason}`);
      }
      
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: { 
          action: 'sync',
          spreadsheetId: googleSheetId
        }
      });
      
      if (error) throw error;
      return data?.values || [];
    },
    enabled: !!googleSheetId,
  });

  const { data: mediaCount } = useQuery({
    queryKey: ['media-count', googleSheetId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  const getSheetUrl = (sheetId: string, gid?: string) => {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
    return gid ? `${baseUrl}/edit#gid=${gid}` : `${baseUrl}/edit`;
  };

  const handleSyncWithMedia = async () => {
    try {
      // Check Google token status before syncing
      const tokenStatus = checkGoogleTokenStatus();
      if (!tokenStatus.isValid) {
        toast({
          title: "Authentication Required",
          description: "Please re-authenticate with Google to continue.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.functions.invoke('google-sheets', {
        body: { 
          action: 'sync-media',
          spreadsheetId: googleSheetId
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Sync Started",
        description: "The sheet is being synced with your media table.",
      });
      
      // Refetch the sheet data after sync
      refetch();
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync with media table. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Check if Google auth is needed
  const tokenStatus = checkGoogleTokenStatus();
  if (!tokenStatus.isValid) {
    return (
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Google Sheets Authentication Required
          </CardTitle>
          <CardDescription>
            Please authenticate with Google to access Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your Google authentication has expired. Please re-authenticate to continue using Google Sheets integration.
            </AlertDescription>
          </Alert>
          <GoogleAuthButton />
        </CardContent>
      </Card>
    );
  }

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
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSyncWithMedia}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Sync with Media ({mediaCount} items)
                  </Button>
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
              </div>
            </Alert>

            {Object.keys(parsedMapping).length === 0 && (
              <Alert variant="warning">
                <AlertTriangle className="h-5 w-5" />
                <AlertDescription>
                  No field mappings configured. Please set up field mappings to enable synchronization.
                </AlertDescription>
              </Alert>
            )}

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

            <SheetDataDisplay 
              isLoading={isDataLoading}
              sheetData={sheetData || []}
              onRefresh={() => refetch()}
              lastSynced={sheetsConfig?.[0]?.updated_at}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};