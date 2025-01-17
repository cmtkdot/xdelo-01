import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, AlertTriangle } from "lucide-react";
import { GoogleSheetsConfig } from "../media/GoogleSheetsConfig";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { checkGoogleTokenStatus } from "../ai-chat/AuthHandler";
import { GoogleAuthButton } from "../media/google-sheets/GoogleAuthButton";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { FieldMappingDisplay } from "./components/FieldMappingDisplay";
import { SheetDataDisplay } from "./SheetDataDisplay";
import { MediaItem } from "../media/types";

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
      
      const tokenStatus = checkGoogleTokenStatus();
      if (!tokenStatus.isValid) {
        throw new Error(`Google authentication required: ${tokenStatus.reason}`);
      }
      
      const accessToken = localStorage.getItem('google_access_token');
      if (!accessToken) {
        throw new Error('Google access token not found');
      }

      const { data, error } = await supabase.functions.invoke('sheets-operations', {
        body: { 
          action: 'read',
          spreadsheetId: googleSheetId
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (error) throw error;
      return data?.data || [];
    },
    enabled: !!googleSheetId,
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

  const formatMediaData = async () => {
    // Fetch all media data
    const { data: mediaData, error } = await supabase
      .from('media')
      .select(`
        *,
        chat:channels(title, username)
      `);

    if (error) throw error;

    // Get the header mapping from sheets config
    const { data: configData, error: configError } = await supabase
      .from('google_sheets_config')
      .select('header_mapping')
      .eq('spreadsheet_id', googleSheetId)
      .single();

    if (configError) throw configError;

    const headerMapping = configData?.header_mapping || {};

    // Format data according to header mapping
    return mediaData.map((item: MediaItem) => {
      const row: string[] = [];
      Object.entries(headerMapping).forEach(([sheetHeader, dbColumn]) => {
        let value = '';
        if (dbColumn.includes('.')) {
          // Handle nested properties (e.g., 'chat.title')
          const [parent, child] = dbColumn.split('.');
          value = item[parent]?.[child] || '';
        } else {
          value = item[dbColumn] || '';
        }
        
        // Format dates
        if (dbColumn === 'created_at' || dbColumn === 'updated_at') {
          value = value ? new Date(value).toLocaleString() : '';
        }
        
        row.push(value.toString());
      });
      return row;
    });
  };

  const handleSyncWithMedia = async () => {
    try {
      const tokenStatus = checkGoogleTokenStatus();
      if (!tokenStatus.isValid) {
        toast({
          title: "Authentication Required",
          description: "Please re-authenticate with Google to continue.",
          variant: "destructive",
        });
        return;
      }

      const accessToken = localStorage.getItem('google_access_token');
      if (!accessToken) {
        throw new Error('Google access token not found');
      }

      // First verify sheet access
      const { error: verifyError } = await supabase.functions.invoke('sheets-operations', {
        body: { 
          action: 'verify',
          spreadsheetId: googleSheetId
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (verifyError) throw verifyError;

      // Then sync data
      const { error: syncError } = await supabase.functions.invoke('sheets-operations', {
        body: { 
          action: 'write',
          spreadsheetId: googleSheetId,
          data: await formatMediaData()
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (syncError) throw syncError;
      
      toast({
        title: "Sync Started",
        description: "The sheet is being synced with your media table.",
      });
      
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

  const getSheetUrl = (sheetId: string) => {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
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
          <Alert variant="warning">
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
          onSpreadsheetIdSet={onSpreadsheetIdSet}
          sheetsConfig={sheetsConfig}
        />

        {googleSheetId && (
          <div className="space-y-4">
            <ConnectionStatus 
              googleSheetId={googleSheetId}
              mediaCount={mediaCount || 0}
              onSyncWithMedia={handleSyncWithMedia}
              getSheetUrl={getSheetUrl}
            />

            <FieldMappingDisplay parsedMapping={parsedMapping} />

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