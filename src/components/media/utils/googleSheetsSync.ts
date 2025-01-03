import { MediaItem } from "../types";

// Constants
export const SPECIFIC_SPREADSHEET_ID = "1fItNaUkO73LXPveUeXSwn9e9JZomu6UUtuC58ep_k2w";
export const SPECIFIC_GID = "1908422891";
export const SYNC_INTERVAL = 30000; // 30 seconds

export const initGoogleSheetsAPI = async () => {
  try {
    if (!window.gapi?.client?.sheets) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = resolve;
        document.body.appendChild(script);
      });

      await new Promise((resolve) => window.gapi.load('client', resolve));
      
      const { data: { api_key } } = await supabase.functions.invoke('get-google-api-key');
      
      await window.gapi.client.init({
        apiKey: api_key,
        clientId: "241566560647-0ovscpbnp0r9767brrb14dv6gjfq5uc4.apps.googleusercontent.com",
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        scope: 'https://www.googleapis.com/auth/spreadsheets'
      });
    }

    // Get the access token from localStorage
    const accessToken = localStorage.getItem('google_access_token');
    if (!accessToken) {
      throw new Error('No access token found. Please authenticate with Google.');
    }

    // Set the access token for the client
    window.gapi.client.setToken({ access_token: accessToken });

    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    throw error;
  }
};

export const initializeSpreadsheet = async (spreadsheetId: string, gid?: string) => {
  try {
    await initGoogleSheetsAPI();
    
    // Verify spreadsheet access
    const response = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId
    });

    if (!response.result) {
      throw new Error('Unable to access spreadsheet');
    }

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
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: formattedData
      }
    });

    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};
