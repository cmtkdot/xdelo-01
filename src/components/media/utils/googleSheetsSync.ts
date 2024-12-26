import { MediaItem } from "../types";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    gapi: any;
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: google.accounts.oauth2.TokenResponse) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

const SHEET_NAME = 'MediaData';
const BASE_HEADERS = [
  'File Name',
  'Media Type',
  'Channel',
  'Created At',
  'Caption',
  'File URL',
  'Google Drive URL',
  'Google Drive ID',
  'Message ID',
  'Media Group ID',
  'File Size',
  'Dimensions'
];

// Format media data for Google Sheets
const formatMediaForSheets = (items: MediaItem[]) => {
  // Get all possible keys from the items' metadata and additional_data
  const extraKeys = new Set<string>();
  items.forEach(item => {
    if (item.metadata) {
      Object.keys(item.metadata).forEach(key => extraKeys.add(`metadata_${key}`));
    }
    if (item.additional_data) {
      Object.keys(item.additional_data).forEach(key => extraKeys.add(`additional_${key}`));
    }
  });

  // Combine base headers with any extra fields found
  const allHeaders = [...BASE_HEADERS, ...Array.from(extraKeys)];

  // Format the data according to all headers
  const formattedData = items.map(item => {
    const baseData = [
      item.file_name,
      item.media_type,
      item.chat?.title || 'N/A',
      new Date(item.created_at || '').toLocaleString(),
      item.caption || 'No caption',
      item.file_url,
      item.google_drive_url || 'Not uploaded',
      item.google_drive_id || 'N/A',
      item.metadata?.message_id || 'N/A',
      item.media_group_id || 'N/A',
      item.metadata?.file_size ? `${Math.round(item.metadata.file_size / 1024)} KB` : 'N/A',
      item.metadata?.width && item.metadata?.height ? `${item.metadata.width}x${item.metadata.height}` : 'N/A'
    ];

    // Add extra fields in the same order as extraKeys
    Array.from(extraKeys).forEach(key => {
      if (key.startsWith('metadata_')) {
        const metaKey = key.replace('metadata_', '');
        baseData.push(item.metadata?.[metaKey]?.toString() || 'N/A');
      } else if (key.startsWith('additional_')) {
        const addKey = key.replace('additional_', '');
        baseData.push(item.additional_data?.[addKey]?.toString() || 'N/A');
      }
    });

    return baseData;
  });

  return { headers: allHeaders, data: formattedData };
};

// Initialize spreadsheet with headers if needed
export const initializeSpreadsheet = async (spreadsheetId: string) => {
  try {
    // Get OAuth2 token from Google Drive component
    const tokenResponse = await new Promise<google.accounts.oauth2.TokenResponse>((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: "977351558653-ohvqd6j78cbei8aufarbdsoskqql05s1.apps.googleusercontent.com",
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: (response) => {
          if ('error' in response) {
            reject(response);
          } else {
            resolve(response);
          }
        },
      });
      tokenClient.requestAccessToken();
    });

    // Set the access token for subsequent requests
    window.gapi.client.setToken({
      access_token: tokenResponse.access_token,
    });

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