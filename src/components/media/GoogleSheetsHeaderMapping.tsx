import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface HeaderMappingProps {
  spreadsheetId: string;
  sheetGid?: string;
  onMappingComplete: (mapping: Record<string, string>) => void;
}

const DEFAULT_DB_COLUMNS = [
  'id',
  'file_name',
  'file_url',
  'media_type',
  'caption',
  'created_at',
  'updated_at',
  'google_drive_id',
  'google_drive_url'
];

export const GoogleSheetsHeaderMapping = ({ 
  spreadsheetId, 
  sheetGid,
  onMappingComplete 
}: HeaderMappingProps) => {
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchHeaders = async () => {
      try {
        // If GID is provided, use it to specify the sheet
        const range = sheetGid ? `gid=${sheetGid}!A1:K1` : 'A1:K1';
        
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        });

        if (response.result.values?.[0]) {
          setSheetHeaders(response.result.values[0]);
          
          // Initialize mapping with existing values from localStorage
          const savedMapping = localStorage.getItem(`headerMapping-${spreadsheetId}`);
          if (savedMapping) {
            setMapping(JSON.parse(savedMapping));
          }
        }
      } catch (error) {
        console.error('Error fetching headers:', error);
        toast({
          title: "Error",
          description: "Failed to fetch sheet headers",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (window.gapi?.client?.sheets) {
      fetchHeaders();
    }
  }, [spreadsheetId, sheetGid, toast]);

  const handleMappingChange = (sheetHeader: string, dbColumn: string) => {
    setMapping(prev => ({
      ...prev,
      [sheetHeader]: dbColumn
    }));
  };

  const handleSaveMapping = () => {
    localStorage.setItem(`headerMapping-${spreadsheetId}`, JSON.stringify(mapping));
    onMappingComplete(mapping);
    toast({
      title: "Success",
      description: "Header mapping saved successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Header Mapping</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {sheetHeaders.map((header, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="min-w-[120px] text-sm">{header}</span>
                <Select
                  value={mapping[header] || ""}
                  onValueChange={(value) => handleMappingChange(header, value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Map to column" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_DB_COLUMNS.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button 
          onClick={handleSaveMapping}
          className="mt-4 w-full"
          variant="outline"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Mapping
        </Button>
      </CardContent>
    </Card>
  );
};