import "../../../types/googleTypes";
import { MediaItem } from "../types";
import { SHEET_NAME, formatMediaForSheets } from "./googleSheets/formatters";
import { getGoogleAuthToken } from "./googleSheets/auth";

// Initialize Google Sheets API
export const initGoogleSheetsAPI = async () => {
  try {
    // Load the Google API client
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.body.appendChild(script);
    });

    // Load the client library
    await new Promise<void>((resolve, reject) => {
      window.gapi.load('client', {
        callback: resolve,
        onerror: () => reject(new Error('Failed to load Google client')),
      });
    });

    // Initialize the Sheets API
    await window.gapi.client.init({
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    });

    console.log('Google Sheets API initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    throw error;
  }
};

// Initialize spreadsheet with headers if needed
export const initializeSpreadsheet = async (spreadsheetId: string) => {
  try {
    const accessToken = await getGoogleAuthToken();
    window.gapi.client.setToken({ access_token: accessToken });

    // First, try to get the spreadsheet to check if it exists
    const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
    });

    // Check if our sheet exists
    const sheet = spreadsheet.result.sheets?.find(
      (s: any) => s.properties?.title === SHEET_NAME
    );

    if (!sheet) {
      // Create the sheet if it doesn't exist
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: SHEET_NAME
              }
            }
          }]
        }
      });
      console.log('Created new sheet:', SHEET_NAME);
    }

    console.log('Spreadsheet initialized successfully');
    return true;
  } catch (error: any) {
    console.error('Error initializing spreadsheet:', error);
    if (error?.result?.error?.status === 'PERMISSION_DENIED') {
      throw new Error('Permission denied. Please make sure you have edit access to this spreadsheet.');
    }
    throw new Error(error?.result?.error?.message || 'Failed to initialize spreadsheet');
  }
};

// Function to sync data with Google Sheets
export const syncWithGoogleSheets = async (spreadsheetId: string, mediaItems: MediaItem[]) => {
  try {
    const { headers, data } = formatMediaForSheets(mediaItems);
    
    // Update headers first
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:${String.fromCharCode(65 + headers.length - 1)}1`,
      valueInputOption: 'RAW',
      resource: {
        values: [headers]
      }
    });

    // Then update the data
    if (data.length > 0) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A2:${String.fromCharCode(65 + headers.length - 1)}${data.length + 1}`,
        valueInputOption: 'RAW',
        resource: {
          values: data
        }
      });
    }

    console.log('Google Sheets sync successful');
    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};