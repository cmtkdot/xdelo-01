import { supabase } from "@/integrations/supabase/client";
import { MediaItem } from "../types";

export const initGoogleSheetsAPI = async () => {
  try {
    console.log('Starting Google Sheets API initialization...');
    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    throw new Error('Failed to initialize Google Sheets API');
  }
};

export const initializeSpreadsheet = async (spreadsheetId: string, gid?: string) => {
  try {
    console.log('Initializing spreadsheet...');
    
    const { data, error } = await supabase.functions.invoke('google-sheets', {
      body: {
        operation: 'get',
        spreadsheetId,
        range: 'A1:Z1'
      }
    });

    if (error) throw error;
    
    // Set up headers in the first row
    await supabase.functions.invoke('google-sheets', {
      body: {
        operation: 'update',
        spreadsheetId,
        range: 'A1:Z1',
        values: [['File Name', 'Type', 'Channel', 'Created At', 'Caption', 'URL', 'Drive URL', 'Drive ID']]
      }
    });

    console.log('Spreadsheet initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing spreadsheet:', error);
    throw error;
  }
};

export const syncWithGoogleSheets = async (
  spreadsheetId: string, 
  mediaItems: MediaItem[], 
  gid?: string,
  columns: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
) => {
  try {
    console.log('Starting sync with Google Sheets...');
    
    const { data: configData, error: configError } = await supabase
      .from('google_sheets_config')
      .select('header_mapping')
      .eq('spreadsheet_id', spreadsheetId)
      .maybeSingle();

    if (configError) throw configError;
    
    const headerMapping = (configData?.header_mapping || {}) as Record<string, string>;
    
    // Format data according to header mapping
    const formattedData = mediaItems.map(item => {
      const row: string[] = [];
      Object.entries(headerMapping).forEach(([sheetHeader, dbField]) => {
        let value = '';
        if (dbField.includes('.')) {
          const [parent, child] = dbField.split('.');
          value = item[parent as keyof MediaItem]?.[child] || '';
        } else {
          value = (item[dbField as keyof MediaItem] || '').toString();
        }
        row.push(value);
      });
      return row;
    });

    // Update spreadsheet with new data
    const { data, error } = await supabase.functions.invoke('google-sheets', {
      body: {
        operation: 'update',
        spreadsheetId,
        range: `A2:${columns[columns.length - 1]}${formattedData.length + 1}`,
        values: formattedData
      }
    });

    if (error) throw error;

    console.log('Google Sheets sync successful');
    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};