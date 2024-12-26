import { useState, useEffect } from "react";
import { GoogleSheetsConfig } from "@/components/media/GoogleSheetsConfig";
import { SheetDataDisplay } from "@/components/google-sheets/SheetDataDisplay";
import { initGoogleSheetsAPI } from "@/components/media/utils/googleSheetsSync";
import { useToast } from "@/components/ui/use-toast";

interface SheetRow {
  [key: string]: string;
}

const GoogleSheet = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sheetData, setSheetData] = useState<SheetRow[]>([]);
  const { toast } = useToast();
  const [googleSheetId, setGoogleSheetId] = useState<string | null>(
    localStorage.getItem('googleSheetId')
  );
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid gap-6">
        <GoogleSheetsConfig
          onSpreadsheetIdSet={handleSpreadsheetIdSet}
          googleSheetId={googleSheetId}
          parsedMapping={parsedMapping}
        />
        
        {googleSheetId && (
          <SheetDataDisplay
            isLoading={isLoading}
            sheetData={sheetData}
          />
        )}
      </div>
    </div>
  );
};

export default GoogleSheet;