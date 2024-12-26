import "./googleSheets/types";
import { MediaItem } from "../types";
import { SHEET_NAME, formatMediaForSheets, BASE_HEADERS } from "./googleSheets/formatters";
import { getGoogleAuthToken } from "./googleSheets/auth";

// Initialize Google Sheets API
export const initGoogleSheetsAPI = async () => {
  try {
    console.log('Starting Google Sheets API initialization...');
    
    // Load the Google API client
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.body.appendChild(script);
    });

    console.log('Google API script loaded');

    // Load the client library
    await new Promise<void>((resolve, reject) => {
      window.gapi.load('client', {
        callback: resolve,
        onerror: () => reject(new Error('Failed to load Google client')),
      });
    });

    console.log('Google client library loaded');

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
    console.log('Getting Google auth token...');
    const accessToken = await getGoogleAuthToken();
    window.gapi.client.setToken({ access_token: accessToken });

    console.log('Checking spreadsheet existence...');
    // First, try to get the spreadsheet to check if it exists
    const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
    });

    // Check if our sheet exists
    let sheetId = 0;
    const sheet = spreadsheet.result.sheets?.find(
      (s: any) => s.properties?.title === SHEET_NAME
    );

    if (!sheet) {
      console.log('Sheet not found, creating new sheet...');
      // Create the sheet if it doesn't exist
      const addSheetResponse = await window.gapi.client.sheets.spreadsheets.batchUpdate({
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

      // Get the new sheet ID
      sheetId = addSheetResponse.result.replies?.[0]?.addSheet?.properties?.sheetId || 0;
      console.log('Created new sheet with ID:', sheetId);
      
      // Add headers to the new sheet
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A1:${String.fromCharCode(65 + BASE_HEADERS.length - 1)}1`,
        valueInputOption: 'RAW',
        resource: {
          values: [BASE_HEADERS]
        }
      });
    } else {
      sheetId = sheet.properties?.sheetId || 0;
      console.log('Found existing sheet with ID:', sheetId);
    }

    // Set up auto-resizing columns
    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          autoResizeDimensions: {
            dimensions: {
              sheetId: sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: BASE_HEADERS.length
            }
          }
        }]
      }
    });

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
    console.log('Starting sync with Google Sheets...');
    const { headers, data } = formatMediaForSheets(mediaItems);
    
    // Get the sheet ID
    const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    const sheet = spreadsheet.result.sheets?.find(
      (s: any) => s.properties?.title === SHEET_NAME
    );
    
    if (!sheet) {
      throw new Error('Sheet not found. Please initialize the spreadsheet first.');
    }
    
    const sheetId = sheet.properties?.sheetId;

    console.log('Clearing existing content...');
    // Clear existing content
    await window.gapi.client.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: SHEET_NAME
    });

    console.log('Updating headers...');
    // Update headers first
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:${String.fromCharCode(65 + headers.length - 1)}1`,
      valueInputOption: 'RAW',
      resource: {
        values: [headers]
      }
    });

    console.log('Updating data...');
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

    console.log('Applying formatting...');
    // Apply formatting
    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                }
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)"
            }
          }
        ]
      }
    });

    console.log('Google Sheets sync successful');
    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};