import { MediaItem } from "../types";
import { supabase } from "@/integrations/supabase/client";

const SHEET_NAME = 'MediaData';
const SHEET_HEADERS = [
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
  return items.map(item => ([
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
  ]));
};

// Initialize spreadsheet with headers if needed
export const initializeSpreadsheet = async (spreadsheetId: string) => {
  try {
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

    // Check if headers exist
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:L1`,
    });

    const currentHeaders = response.result.values?.[0] || [];
    
    // If no headers or headers are different, update them
    if (currentHeaders.length === 0 || !arraysEqual(currentHeaders, SHEET_HEADERS)) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A1:L1`,
        valueInputOption: 'RAW',
        resource: {
          values: [SHEET_HEADERS]
        }
      });
      console.log('Sheet headers initialized');
    }
  } catch (error: any) {
    console.error('Error initializing spreadsheet:', error);
    if (error?.result?.error?.status === 'PERMISSION_DENIED') {
      throw new Error('Permission denied. Please make sure you have edit access to this spreadsheet.');
    }
    throw new Error(error?.result?.error?.message || 'Failed to initialize spreadsheet headers');
  }
};

// Helper function to compare arrays
const arraysEqual = (a: any[], b: any[]) => {
  return a.length === b.length && a.every((val, index) => val === b[index]);
};

// Function to sync data with Google Sheets
export const syncWithGoogleSheets = async (spreadsheetId: string, mediaItems: MediaItem[]) => {
  try {
    const { data: { GOOGLE_API_KEY } } = await supabase.functions.invoke('get-google-api-key');
    
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not found');
    }

    const formattedData = formatMediaForSheets(mediaItems);
    
    // Ensure Google API is loaded
    if (!window.gapi || !window.gapi.client) {
      throw new Error('Google API not loaded');
    }

    // Update the sheet starting from row 2 (after headers)
    const response = await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A2:L`,
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
    // Get API key from Supabase
    const { data: { GOOGLE_API_KEY } } = await supabase.functions.invoke('get-google-api-key');
    
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not found');
    }

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
      apiKey: GOOGLE_API_KEY,
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    });

    console.log('Google Sheets API initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    throw error;
  }
};