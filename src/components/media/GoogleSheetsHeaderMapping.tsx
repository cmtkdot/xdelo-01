import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from "@/integrations/supabase/client";

interface HeaderMappingProps {
  spreadsheetId: string;
  sheetGid?: string;
  onMappingComplete: (mapping: Record<string, string>) => void;
}

const DEFAULT_DB_COLUMNS = [
  'id',
  'user_id',
  'chat_id',
  'file_name',
  'file_url',
  'media_type',
  'caption',
  'metadata',
  'created_at',
  'updated_at',
  'media_group_id',
  'additional_data',
  'google_drive_id',
  'google_drive_url',
  'chat.title',
  'chat.username'
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
        let range;
        if (sheetGid) {
          const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
            spreadsheetId,
          });
          
          const targetSheet = spreadsheet.result.sheets?.find(
            (s: any) => s.properties?.sheetId === parseInt(sheetGid)
          );
          
          if (!targetSheet) {
            throw new Error(`Sheet with GID ${sheetGid} not found`);
          }
          
          range = `${targetSheet.properties?.title}!A1:Z1`;
        } else {
          range = 'A1:Z1';
        }
        
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        });

        if (response.result.values?.[0]) {
          setSheetHeaders(response.result.values[0]);
          
          // Load existing mapping from Supabase
          const { data: configData } = await supabase
            .from('google_sheets_config')
            .select('header_mapping')
            .eq('spreadsheet_id', spreadsheetId)
            .single();
          
          if (configData?.header_mapping) {
            setMapping(configData.header_mapping);
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

  const handleSaveMapping = async () => {
    try {
      // Save mapping to Supabase
      const { error } = await supabase
        .from('google_sheets_config')
        .update({ 
          header_mapping: mapping,
          is_headers_mapped: true 
        })
        .eq('spreadsheet_id', spreadsheetId);

      if (error) throw error;
      
      onMappingComplete(mapping);
      toast({
        title: "Success",
        description: "Header mapping saved successfully",
      });
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast({
        title: "Error",
        description: "Failed to save header mapping",
        variant: "destructive",
      });
    }
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
        <CardTitle className="text-sm font-medium">
          Header Mapping {sheetGid ? `(Sheet GID: ${sheetGid})` : ''}
        </CardTitle>
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