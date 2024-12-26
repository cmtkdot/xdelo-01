import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSheetsConfig } from "@/components/media/GoogleSheetsConfig";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const GoogleSheet = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const { toast } = useToast();
  const googleSheetId = localStorage.getItem('googleSheetId');
  const headerMapping = localStorage.getItem('headerMapping');
  const parsedMapping: Record<string, string> = headerMapping ? JSON.parse(headerMapping) : {};

  useEffect(() => {
    const fetchSheetData = async () => {
      if (!googleSheetId) return;
      
      setIsLoading(true);
      try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: googleSheetId,
          range: 'MediaData!A:Z',
        });
        
        if (response.result.values) {
          const [headers, ...rows] = response.result.values;
          const formattedData = rows.map(row => {
            const obj: Record<string, string> = {};
            headers.forEach((header: string, index: number) => {
              obj[header] = row[index] || '';
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid gap-6">
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
          <CardContent>
            <GoogleSheetsConfig
              onSpreadsheetIdSet={(id) => {
                localStorage.setItem('googleSheetId', id);
                window.location.reload();
              }}
            />
          </CardContent>
        </Card>

        {googleSheetId && (
          <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Connected Sheet Data</CardTitle>
              <CardDescription>
                View and manage your connected Google Sheet data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Sheet ID: {googleSheetId}</span>
                  </div>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${googleSheetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Open in Google Sheets
                  </a>
                </div>

                {Object.keys(parsedMapping).length > 0 && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <h3 className="text-sm font-medium text-white mb-2">Field Mappings</h3>
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

                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : sheetData.length > 0 ? (
                  <ScrollArea className="h-[400px] rounded-md border border-white/10">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(sheetData[0]).map((header) => (
                            <TableHead key={header}>{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheetData.map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value, cellIndex) => (
                              <TableCell key={cellIndex}>{value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center gap-2 text-white/60 p-4">
                    <XCircle className="h-5 w-5" />
                    <span>No data available</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GoogleSheet;