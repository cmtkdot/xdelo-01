import { MediaItem } from "../types";
import { supabase } from "@/integrations/supabase/client";

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
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/init-google-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ spreadsheetId, gid }),
    });

    if (!response.ok) {
      throw new Error('Failed to initialize spreadsheet');
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
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-google-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
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
          item.google_drive_id || ''
        ])
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to sync with Google Sheets');
    }

    console.log('Sync completed successfully');
    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};