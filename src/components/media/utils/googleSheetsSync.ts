import { supabase } from "@/integrations/supabase/client";
import { MediaItem } from "../types";

// Constants
export const SPECIFIC_SPREADSHEET_ID = "1fItNaUkO73LXPveUeXSwn9e9JZomu6UUtuC58ep_k2w";
export const SPECIFIC_GID = "1908422891";
export const SYNC_INTERVAL = 30000; // 30 seconds

// Default columns to sync
export const DEFAULT_SYNC_COLUMNS = [
  'file_name',
  'media_type',
  'caption',
  'file_url',
  'google_drive_url',
  'public_url',
  'created_at',
  'updated_at',
  'id'
];

export const initGoogleSheetsAPI = async () => {
  try {
    console.log('Initializing Google Sheets sync with service account...');
    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    throw error;
  }
};

export const initializeSpreadsheet = async (spreadsheetId: string, gid?: string) => {
  try {
    console.log('Verifying spreadsheet access...');
    const { data, error } = await supabase.functions.invoke('init-google-sheet', {
      body: { spreadsheetId, gid },
    });

    if (error) {
      console.error('Error initializing spreadsheet:', error);
      throw error;
    }

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
  gid?: string
) => {
  try {
    console.log('Starting Google Sheets sync...');
    
    // Get existing header mapping from config
    const { data: configData, error: configError } = await supabase
      .from('google_sheets_config')
      .select('header_mapping')
      .eq('spreadsheet_id', spreadsheetId)
      .single();

    if (configError) throw configError;

    const headerMapping = configData?.header_mapping || {};
    
    // Format data based on header mapping
    const formattedData = mediaItems.map(item => {
      const row: string[] = [];
      Object.entries(headerMapping).forEach(([sheetHeader, dbColumn]) => {
        let value = '';
        if (dbColumn.includes('.')) {
          // Handle nested properties (e.g., 'chat.title')
          const [parent, child] = dbColumn.split('.');
          value = item[parent]?.[child] || '';
        } else {
          value = item[dbColumn] || '';
        }
        
        // Format dates
        if (dbColumn === 'created_at' || dbColumn === 'updated_at') {
          value = value ? new Date(value).toLocaleString() : '';
        }
        
        row.push(value.toString());
      });
      return row;
    });

    const { data, error } = await supabase.functions.invoke('google-sheets', {
      body: {
        action: 'sync',
        spreadsheetId,
        gid,
        data: formattedData,
        headerMapping
      },
    });

    if (error) throw error;

    // Update last sync timestamp
    await supabase
      .from('google_sheets_config')
      .update({ updated_at: new Date().toISOString() })
      .eq('spreadsheet_id', spreadsheetId);

    console.log('Sync completed successfully');
    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};