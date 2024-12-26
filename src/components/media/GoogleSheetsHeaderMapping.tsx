import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { HeaderMappingSelect } from './google-sheets/header-mapping/HeaderMappingSelect';
import { HeaderMappingActions } from './google-sheets/header-mapping/HeaderMappingActions';

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
          
          // Get the current user's ID
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');
          
          // Load existing mapping from Supabase
          const { data: configData, error } = await supabase
            .from('google_sheets_config')
            .select('header_mapping')
            .eq('spreadsheet_id', spreadsheetId)
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (error) throw error;
          
          if (configData?.header_mapping) {
            const headerMapping = configData.header_mapping as Record<string, string>;
            setMapping(headerMapping);
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
    // Remove any existing mappings to this dbColumn
    const newMapping = { ...mapping };
    Object.keys(newMapping).forEach(key => {
      if (newMapping[key] === dbColumn) {
        delete newMapping[key];
      }
    });
    
    // Add the new mapping
    newMapping[sheetHeader] = dbColumn;
    setMapping(newMapping);
  };

  const handleSelectAll = () => {
    const newMapping: Record<string, string> = {};
    const usedColumns = new Set<string>();
    
    sheetHeaders.forEach(header => {
      // Try to find a matching column name that hasn't been used yet
      const matchingColumn = DEFAULT_DB_COLUMNS.find(col => 
        !usedColumns.has(col) && col.toLowerCase() === header.toLowerCase()
      );
      
      if (matchingColumn) {
        newMapping[header] = matchingColumn;
        usedColumns.add(matchingColumn);
      } else {
        // Find the first available unused column
        const availableColumn = DEFAULT_DB_COLUMNS.find(col => !usedColumns.has(col));
        if (availableColumn) {
          newMapping[header] = availableColumn;
          usedColumns.add(availableColumn);
        }
      }
    });
    
    setMapping(newMapping);
  };

  const handleSaveMapping = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('google_sheets_config')
        .update({ 
          header_mapping: mapping,
          is_headers_mapped: true 
        })
        .eq('spreadsheet_id', spreadsheetId)
        .eq('user_id', user.id);

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

  // Check if all available columns are mapped
  const isAllColumnsMapped = () => {
    const mappedColumns = new Set(Object.values(mapping));
    return mappedColumns.size >= DEFAULT_DB_COLUMNS.length;
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
            {sheetHeaders.map((header) => (
              <HeaderMappingSelect
                key={header}
                header={header}
                value={mapping[header] || ""}
                dbColumns={DEFAULT_DB_COLUMNS}
                onChange={(value) => handleMappingChange(header, value)}
              />
            ))}
          </div>
        </ScrollArea>
        <div className="mt-4">
          <HeaderMappingActions
            onSave={handleSaveMapping}
            onSelectAll={handleSelectAll}
            isSelectAllDisabled={isAllColumnsMapped()}
          />
        </div>
      </CardContent>
    </Card>
  );
};