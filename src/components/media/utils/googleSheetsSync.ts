import "./googleSheets/types";
import { MediaItem } from "../types";
import { SHEET_NAME, formatMediaForSheets, BASE_HEADERS } from "./googleSheets/formatters";
import { supabase } from "@/integrations/supabase/client";

const COLUMN_LIMIT = 'K';
const MAX_COLUMNS = 26;

export const initGoogleSheetsAPI = async () => {
  try {
    console.log('Starting Google Sheets API initialization...');
    
    // Load the Google API client library
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.body.appendChild(script);
    });

    // Initialize the client
    await new Promise<void>((resolve, reject) => {
      window.gapi.load('client', {
        callback: () => {
          window.gapi.client.init({
            apiKey: process.env.GOOGLE_API_KEY,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
          })
          .then(() => resolve())
          .catch((error: any) => reject(error));
        },
        onerror: () => reject(new Error('Failed to load Google client')),
      });
    });

    console.log('Google Sheets API initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    throw new Error('Failed to initialize Google Sheets API. Using service account authentication instead.');
  }
};

export const initializeSpreadsheet = async (spreadsheetId: string, gid?: string) => {
  try {
    console.log('Initializing spreadsheet with service account...');
    
    // Use Edge Function to handle spreadsheet initialization with service account
    const { data, error } = await supabase.functions.invoke('init-google-sheet', {
      body: { 
        spreadsheetId,
        gid,
        sheetName: SHEET_NAME,
        headers: BASE_HEADERS
      }
    });

    if (error) throw error;
    
    console.log('Spreadsheet initialized successfully:', data);
    return true;
  } catch (error: any) {
    console.error('Error initializing spreadsheet:', error);
    throw new Error(error?.message || 'Failed to initialize spreadsheet');
  }
};

const formatDataWithMapping = (mediaItems: MediaItem[], headerMapping: Record<string, string>) => {
  const reverseMapping: Record<string, string> = {};
  Object.entries(headerMapping).forEach(([sheetHeader, dbField]) => {
    reverseMapping[dbField] = sheetHeader;
  });

  const mappedHeaders = Object.keys(headerMapping);
  
  const formattedData = mediaItems.map(item => {
    const row: string[] = new Array(mappedHeaders.length).fill('');
    
    mappedHeaders.forEach((sheetHeader, index) => {
      const dbField = headerMapping[sheetHeader];
      if (dbField) {
        let value = '';
        
        if (dbField.includes('.')) {
          const [parent, child] = dbField.split('.');
          value = item[parent as keyof MediaItem]?.[child] || '';
        } else {
          value = (item[dbField as keyof MediaItem] || '').toString();
        }
        
        row[index] = value;
      }
    });
    
    return row;
  });

  return { headers: mappedHeaders, data: formattedData };
};

export const syncWithGoogleSheets = async (spreadsheetId: string, mediaItems: MediaItem[], gid?: string) => {
  try {
    console.log('Starting sync with Google Sheets using service account...');
    
    const { data: configData, error: configError } = await supabase
      .from('google_sheets_config')
      .select('header_mapping')
      .eq('spreadsheet_id', spreadsheetId)
      .maybeSingle();

    if (configError) throw configError;
    
    const headerMapping = (configData?.header_mapping || {}) as Record<string, string>;
    const { headers, data } = formatDataWithMapping(mediaItems, headerMapping);
    
    // Use Edge Function to handle the sync with service account
    const { data: syncResult, error: syncError } = await supabase.functions.invoke('sync-google-sheet', {
      body: { 
        spreadsheetId,
        gid,
        sheetName: SHEET_NAME,
        headers,
        data
      }
    });

    if (syncError) throw syncError;

    console.log('Google Sheets sync successful');
    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};