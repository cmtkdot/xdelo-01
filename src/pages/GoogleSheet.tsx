import { useState, useEffect } from "react";
import { GoogleSheetsConfig } from "@/components/media/GoogleSheetsConfig";
import { SheetDataDisplay } from "@/components/google-sheets/SheetDataDisplay";
import { initGoogleSheetsAPI } from "@/components/media/utils/googleSheetsSync";
import { useToast } from "@/components/ui/use-toast";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_CLIENT_ID = "977351558653-ohvqd6j78cbei8aufarbdsoskqql05s1.apps.googleusercontent.com";

const GoogleSheet = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sheetData, setSheetData] = useState<Record<string, string>[]>([]);
  const { toast } = useToast();
  const [googleSheetId, setGoogleSheetId] = useState<string | null>(
    localStorage.getItem('googleSheetId')
  );

  const { data: sheetsConfig } = useQuery({
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

  const headerMapping = localStorage.getItem('headerMapping');
  const parsedMapping: Record<string, string> = headerMapping ? JSON.parse(headerMapping) : {};

  useEffect(() => {
    const fetchSheetData = async () => {
      if (!googleSheetId || !window.gapi?.client?.sheets) {
        return;
      }
      
      setIsLoading(true);
      try {
        await initGoogleSheetsAPI();
        
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: googleSheetId,
          range: 'MediaData!A:Z',
        });
        
        if (response.result.values) {
          const [headers, ...rows] = response.result.values;
          const formattedData = rows.map(row => {
            const obj: Record<string, string> = {};
            headers.forEach((header: string, index: number) => {
              obj[header] = row[index]?.toString() || '';
            });
            return obj;
          });
          setSheetData(formattedData);
        }
      } catch (error) {
        console.error('Error fetching sheet data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch Google Sheet data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (googleSheetId) {
      fetchSheetData();
    }
  }, [googleSheetId, toast]);

  const handleSpreadsheetIdSet = (id: string) => {
    setGoogleSheetId(id);
    localStorage.setItem('googleSheetId', id);
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Table className="w-6 h-6 text-purple-400" />
            <div>
              <CardTitle>Google Sheets Integration</CardTitle>
              <CardDescription>Connect and manage your Google Sheets synchronization</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <GoogleSheetsConfig
              onSpreadsheetIdSet={handleSpreadsheetIdSet}
              googleSheetId={googleSheetId}
              sheetsConfig={sheetsConfig}
            />
            
            {googleSheetId && (
              <SheetDataDisplay
                isLoading={isLoading}
                sheetData={sheetData}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </GoogleOAuthProvider>
  );
};

export default GoogleSheet;