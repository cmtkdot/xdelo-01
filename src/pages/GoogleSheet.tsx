import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function GoogleSheet() {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    if (!spreadsheetId) {
      toast({
        title: "Error",
        description: "Please enter a spreadsheet ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sheets-operations', {
        body: { 
          action: 'write',
          spreadsheetId,
          data: await formatMediaData()
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Data synced successfully",
      });

      // Fetch updated data
      await fetchSheetData();
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Error",
        description: "Failed to sync data. Please check the logs.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSheetData = async () => {
    if (!spreadsheetId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sheets-operations', {
        body: { 
          action: 'read',
          spreadsheetId
        }
      });

      if (error) throw error;
      setSheetData(data?.data || []);
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sheet data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatMediaData = async () => {
    const { data: mediaData, error } = await supabase
      .from('media')
      .select(`
        *,
        chat:channels(title, username)
      `);

    if (error) throw error;

    return mediaData.map((item: any) => [
      item.id,
      item.file_name,
      item.media_type,
      item.caption || '',
      item.chat?.title || '',
      item.created_at ? new Date(item.created_at).toLocaleString() : '',
      item.public_url || ''
    ]);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Google Sheets Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Enter Google Sheet ID"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleSync}
              disabled={isLoading || !spreadsheetId}
              className="gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync Data
            </Button>
          </div>

          {sheetData.length > 0 ? (
            <ScrollArea className="h-[600px] rounded-md border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    {sheetData[0].map((header: string, index: number) => (
                      <TableHead key={index} className="whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheetData.slice(1).map((row: string[], rowIndex: number) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell: string, cellIndex: number) => (
                        <TableCell key={cellIndex}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <Alert>
              <AlertDescription>
                No data available. Enter a spreadsheet ID and click sync to load data.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}