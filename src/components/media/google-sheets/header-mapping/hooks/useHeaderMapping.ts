import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/components/ui/use-toast';
import { initGoogleSheetsAPI } from '../../utils/googleSheets/auth';

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
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchHeaders = async () => {
      try {
        setError(null);
        setIsLoading(true);

        // Initialize Google Sheets API with proper auth
        await initGoogleSheetsAPI();

        // Get the access token from localStorage
        const accessToken = localStorage.getItem('google_access_token');
        if (!accessToken) {
          throw new Error('No access token found. Please authenticate with Google.');
        }

        // Set the access token for the client
        if (window.gapi?.client) {
          window.gapi.client.setToken({ access_token: accessToken });
        } else {
          throw new Error('Google API client not initialized');
        }

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

        if (!response.result.values?.[0]) {
          throw new Error('No headers found in the sheet');
        }

        setSheetHeaders(response.result.values[0]);
        
        // Fetch existing mapping if available
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data: configData, error: dbError } = await supabase
          .from('google_sheets_config')
          .select('header_mapping')
          .eq('spreadsheet_id', spreadsheetId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (dbError) throw dbError;
        
        if (configData?.header_mapping) {
          const headerMapping = configData.header_mapping as Record<string, string>;
          setMapping(headerMapping);
        }
      } catch (err) {
        const error = err as Error;
        console.error('Error fetching headers:', error);
        setError(error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch sheet headers",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (spreadsheetId) {
      fetchHeaders();
    }
  }, [spreadsheetId, sheetGid, toast]);

  const handleMappingChange = (sheetHeader: string, dbColumn: string) => {
    const newMapping = { ...mapping };
    
    if (!dbColumn) {
      delete newMapping[sheetHeader];
    } else {
      // Remove the dbColumn if it's already mapped to another header
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
    if (!mapping || !Object.keys(mapping).length) return false;
    const mappedColumns = new Set(Object.values(mapping));
    return mappedColumns.size >= Math.min(dbColumns.length, sheetHeaders.length);
  };

  return {
    sheetHeaders,
    mapping,
    isLoading,
    error,
    handleMappingChange,
    handleSelectAll,
    handleSaveMapping,
    isAllColumnsMapped,
  };
};