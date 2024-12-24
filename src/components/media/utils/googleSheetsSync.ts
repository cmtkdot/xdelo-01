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
    
    // Load the Google Sheets API
    await new Promise((resolve, reject) => {
      if (typeof gapi !== 'undefined' && gapi.client?.sheets) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load Google Sheets API'));
      document.body.appendChild(script);
    });

    // Initialize the Sheets API
    await gapi.client.init({
      apiKey: 'YOUR_API_KEY',
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    });

    // Update the sheet
    const response = await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Supabase!A2:H',
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
    // Load the Google Sheets API
    await new Promise((resolve, reject) => {
      if (typeof gapi !== 'undefined') {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load Google Sheets API'));
      document.body.appendChild(script);
    });

    await gapi.load('client', async () => {
      await gapi.client.init({
        apiKey: 'YOUR_API_KEY',
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      });
    });
    
    console.log('Google Sheets API initialized');
    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    throw error;
  }
};