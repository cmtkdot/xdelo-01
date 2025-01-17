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
    const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
      body: { 
        action: "init",
        spreadsheetId,
        gid
      },
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
    
    // Format data for sync
    const formattedData = mediaItems.map(item => {
      const row = [];
      for (const column of DEFAULT_SYNC_COLUMNS) {
        let value: string = '';
        if (column.includes('.')) {
          // Handle nested properties (e.g., 'chat.title')
          const [parent, child] = column.split('.');
          const parentValue = item[parent as keyof MediaItem];
          if (parentValue && typeof parentValue === 'object' && child in parentValue) {
            value = String(parentValue[child as keyof typeof parentValue] || '');
          }
        } else {
          const itemValue = item[column as keyof MediaItem];
          // Convert any value to string
          value = itemValue !== null && itemValue !== undefined ? String(itemValue) : '';
        }
        
        // Format dates
        if (column === 'created_at' || column === 'updated_at') {
          value = value ? new Date(value).toLocaleString() : '';
        }
        
        row.push(value);
      }
      return row;
    });

    const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
      body: {
        action: 'sync',
        spreadsheetId,
        gid,
        data: formattedData,
        columns: DEFAULT_SYNC_COLUMNS
      },
    });

    if (error) throw error;

    console.log('Sync completed successfully');
    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};