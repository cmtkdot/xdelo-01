import { MediaItem } from "../types";
import { supabase } from "@/integrations/supabase/client";

// Constants
export const SPECIFIC_SPREADSHEET_ID = "1fItNaUkO73LXPveUeXSwn9e9JZomu6UUtuC58ep_k2w";
export const SPECIFIC_GID = "1908422891";
export const SYNC_INTERVAL = 30000; // 30 seconds

export const initGoogleSheetsAPI = async () => {
  try {
    if (typeof window.gapi === 'undefined') {
      console.log('Loading Google API client...');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }

    if (!window.gapi?.client?.sheets) {
      console.log('Initializing Google API client...');
      
      await new Promise((resolve, reject) => {
        window.gapi.load('client', { callback: resolve, onerror: reject });
      });

      const { data: { api_key } } = await supabase.functions.invoke('get-google-api-key');
      
      await window.gapi.client.init({
        apiKey: api_key,
        discoveryDocs: [
          'https://sheets.googleapis.com/$discovery/rest?version=v4',
          'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
        ],
      });
    }

    const accessToken = localStorage.getItem('google_access_token');
    if (!accessToken) {
      throw new Error('No access token found. Please authenticate with Google.');
    }

    window.gapi.client.setToken({ access_token: accessToken });
    console.log('Google API client initialized successfully');

    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    throw error;
  }
};

export const initializeSpreadsheet = async (spreadsheetId: string, gid?: string) => {
  try {
    await initGoogleSheetsAPI();
    
    console.log('Verifying spreadsheet access...');
    const response = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId
    });

    if (!response.result) {
      throw new Error('Unable to access spreadsheet');
    }

    console.log('Spreadsheet access verified successfully');
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
    await initGoogleSheetsAPI();

    // Format data for sheets
    const formattedData = mediaItems.map(item => [
      item.file_name,
      item.media_type,
      item.chat?.title || '',
      new Date(item.created_at || '').toLocaleString(),
      item.caption || '',
      item.file_url,
      item.google_drive_url || '',
      item.google_drive_id || ''
    ]);

    // Update spreadsheet
    const range = `A2:H${formattedData.length + 1}`;
    console.log(`Updating spreadsheet range: ${range}`);
    
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: formattedData
      }
    });

    console.log('Spreadsheet updated successfully');
    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};
