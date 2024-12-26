import "./googleSheets/types";
import { MediaItem } from "../types";
import { SHEET_NAME, formatMediaForSheets, BASE_HEADERS } from "./googleSheets/formatters";
import { getGoogleAuthToken } from "./googleSheets/auth";

const COLUMN_LIMIT = 'K';
const MAX_COLUMNS = 26;

export const initGoogleSheetsAPI = async () => {
  try {
    console.log('Starting Google Sheets API initialization...');
    
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.body.appendChild(script);
    });

    await new Promise<void>((resolve, reject) => {
      window.gapi.load('client', {
        callback: resolve,
        onerror: () => reject(new Error('Failed to load Google client')),
      });
    });

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

export const initializeSpreadsheet = async (spreadsheetId: string, gid?: string) => {
  try {
    console.log('Getting Google auth token...');
    const accessToken = await getGoogleAuthToken();
    window.gapi.client.setToken({ access_token: accessToken });

    const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
    });

    let targetSheet;
    if (gid) {
      targetSheet = spreadsheet.result.sheets?.find(
        (s: any) => s.properties?.sheetId === parseInt(gid)
      );
      if (!targetSheet) {
        throw new Error(`Sheet with GID ${gid} not found`);
      }
    } else {
      targetSheet = spreadsheet.result.sheets?.find(
        (s: any) => s.properties?.title === SHEET_NAME
      );
    }

    let sheetId = 0;
    if (!targetSheet) {
      console.log('Sheet not found, creating new sheet...');
      const addSheetResponse = await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: SHEET_NAME,
                sheetId: gid ? parseInt(gid) : undefined
              }
            }
          }]
        }
      });

      sheetId = addSheetResponse.result.replies?.[0]?.addSheet?.properties?.sheetId || 0;
      
      const range = gid ? `${SHEET_NAME}!A1:${COLUMN_LIMIT}1` : `${SHEET_NAME}!A1:${COLUMN_LIMIT}1`;
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: {
          values: [BASE_HEADERS.slice(0, COLUMN_LIMIT.charCodeAt(0) - 64)]
        }
      });
    } else {
      sheetId = targetSheet.properties?.sheetId || 0;
    }

    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          autoResizeDimensions: {
            dimensions: {
              sheetId: sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: MAX_COLUMNS
            }
          }
        }]
      }
    });

    return true;
  } catch (error: any) {
    console.error('Error initializing spreadsheet:', error);
    if (error?.result?.error?.status === 'PERMISSION_DENIED') {
      throw new Error('Permission denied. Please make sure you have edit access to this spreadsheet.');
    }
    throw new Error(error?.result?.error?.message || 'Failed to initialize spreadsheet');
  }
};

export const syncWithGoogleSheets = async (spreadsheetId: string, mediaItems: MediaItem[], gid?: string) => {
  try {
    console.log('Starting sync with Google Sheets...');
    const { headers, data } = formatMediaForSheets(mediaItems);
    
    const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    let targetSheet;
    if (gid) {
      targetSheet = spreadsheet.result.sheets?.find(
        (s: any) => s.properties?.sheetId === parseInt(gid)
      );
      if (!targetSheet) {
        throw new Error(`Sheet with GID ${gid} not found`);
      }
    } else {
      targetSheet = spreadsheet.result.sheets?.find(
        (s: any) => s.properties?.title === SHEET_NAME
      );
    }
    
    if (!targetSheet) {
      throw new Error('Sheet not found. Please initialize the spreadsheet first.');
    }

    const sheetName = targetSheet.properties?.title;
    const existingData = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:${String.fromCharCode(64 + MAX_COLUMNS)}`,
    });

    const existingValues = existingData.result.values || [];
    const existingHeaders = existingValues[0] || [];

    const mergedData = data.map((row, rowIndex) => {
      const existingRow = existingValues[rowIndex + 1] || [];
      const newRow = [...row];

      for (let i = COLUMN_LIMIT.charCodeAt(0) - 64; i < existingRow.length; i++) {
        newRow[i] = existingRow[i];
      }

      return newRow;
    });

    const mergedHeaders = [...headers];
    for (let i = headers.length; i < existingHeaders.length; i++) {
      mergedHeaders[i] = existingHeaders[i];
    }

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:${String.fromCharCode(64 + Math.max(headers.length, existingHeaders.length))}1`,
      valueInputOption: 'RAW',
      resource: {
        values: [mergedHeaders]
      }
    });

    if (mergedData.length > 0) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A2:${String.fromCharCode(64 + Math.max(headers.length, existingHeaders.length))}${mergedData.length + 1}`,
        valueInputOption: 'RAW',
        resource: {
          values: mergedData
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