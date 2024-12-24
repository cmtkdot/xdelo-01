import { MediaItem } from "../types";
import { supabase } from "@/integrations/supabase/client";

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
    const { data: { GOOGLE_API_KEY } } = await supabase.functions.invoke('get-google-api-key');
    
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not found');
    }

    const formattedData = formatMediaForSheets(mediaItems);
    
    // Ensure Google API is loaded
    if (!window.gapi || !window.gapi.client) {
      throw new Error('Google API not loaded');
    }

    // Update the sheet
    const response = await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Media Data!A2:H',
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