import { supabase } from "@/integrations/supabase/client";
import { MediaItem } from "../types";

// Constants
export const SPECIFIC_SPREADSHEET_ID = "1fItNaUkO73LXPveUeXSwn9e9JZomu6UUtuC58ep_k2w";
export const SPECIFIC_GID = "1908422891";
export const SYNC_INTERVAL = 30000; // 30 seconds

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
    
    const { data, error } = await supabase.functions.invoke('sync-google-sheet', {
      body: {
        spreadsheetId,
        gid,
        data: mediaItems.map(item => [
          item.file_name,
          item.media_type,
          item.chat?.title || '',
          new Date(item.created_at || '').toLocaleString(),
          item.caption || '',
          item.file_url,
          item.google_drive_url || '',
          item.google_drive_id || '',
          new Date(item.updated_at || '').toLocaleString(),
          item.media_group_id || '',
          item.id,
          item.public_url || ''  // Added public URL
        ])
      },
    });

    if (error) {
      throw error;
    }

    console.log('Sync completed successfully');
    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};