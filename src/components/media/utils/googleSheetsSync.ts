import { MediaItem } from "../types";

// This function formats media data for Google Sheets
const formatMediaForSheets = (items: MediaItem[]) => {
  return items.map(item => ([
    item.file_name,
    item.media_type,
    item.chat?.title || 'N/A',
    new Date(item.created_at || '').toLocaleString(),
    item.caption || 'No caption',
    item.file_url,
    item.google_drive_url || 'Not uploaded',
    item.google_drive_id || 'N/A'
  ]));
};

// Function to sync data with Google Sheets
export const syncWithGoogleSheets = async (spreadsheetId: string, mediaItems: MediaItem[]) => {
  try {
    const formattedData = formatMediaForSheets(mediaItems);
    
    // First, we need to get access to the Google Sheets API
    const response = await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A2:H', // Assuming headers are in row 1
      valueInputOption: 'RAW',
      resource: {
        values: formattedData
      }
    });

    console.log('Google Sheets sync successful:', response);
    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};

// Initialize Google Sheets API
export const initGoogleSheetsAPI = async () => {
  try {
    await gapi.client.init({
      apiKey: 'YOUR_API_KEY', // We'll get this from Supabase secrets
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      scope: 'https://www.googleapis.com/auth/spreadsheets'
    });
    
    console.log('Google Sheets API initialized');
    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    throw error;
  }
};