import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/components/ui/use-toast';

interface UseHeaderMappingProps {
  spreadsheetId: string;
  sheetGid?: string;
  onMappingComplete: (mapping: Record<string, string>) => void;
}

export const useHeaderMapping = ({ 
  spreadsheetId, 
  sheetGid,
  onMappingComplete 
}: UseHeaderMappingProps) => {
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
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');
          
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
    const newMapping = { ...mapping };
    
    if (!dbColumn) {
      delete newMapping[sheetHeader];
    } else {
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key] === dbColumn) {
          delete newMapping[key];
        }
      });
      newMapping[sheetHeader] = dbColumn;
    }
    
    setMapping(newMapping);
  };

  const handleSelectAll = (dbColumns: string[]) => {
    const newMapping: Record<string, string> = {};
    const usedColumns = new Set<string>();
    
    sheetHeaders.forEach(header => {
      const matchingColumn = dbColumns.find(col => 
        !usedColumns.has(col) && col.toLowerCase() === header.toLowerCase()
      );
      
      if (matchingColumn) {
        newMapping[header] = matchingColumn;
        usedColumns.add(matchingColumn);
      } else {
        const availableColumn = dbColumns.find(col => !usedColumns.has(col));
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

  const isAllColumnsMapped = (dbColumns: string[]) => {
    const mappedColumns = new Set(Object.values(mapping));
    return mappedColumns.size >= dbColumns.length;
  };

  return {
    sheetHeaders,
    mapping,
    isLoading,
    handleMappingChange,
    handleSelectAll,
    handleSaveMapping,
    isAllColumnsMapped,
  };
};