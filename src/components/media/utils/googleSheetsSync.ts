import { MediaItem } from "../types";
import { SHEET_NAME, formatMediaForSheets, BASE_HEADERS } from "./googleSheets/formatters";
import { supabase } from "@/integrations/supabase/client";

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const CLIENT_ID = '977351558653-ohvqd6j78cbei8aufarbdsoskqql05s1.apps.googleusercontent.com';

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

    // Load the Google Identity Services library
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.body.appendChild(script);
    });

    // Initialize the client
    await new Promise<void>((resolve, reject) => {
      window.gapi.load('client', {
        callback: () => {
          window.gapi.client.init({
            clientId: CLIENT_ID,
            scope: SCOPES,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
          })
          .then(() => {
            // Check if user is signed in
            if (!window.gapi.auth2?.getAuthInstance()?.isSignedIn.get()) {
              return window.gapi.auth2.getAuthInstance().signIn();
            }
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
    throw new Error('Failed to initialize Google Sheets API');
  }
};

export const initializeSpreadsheet = async (spreadsheetId: string, gid?: string) => {
  try {
    console.log('Initializing spreadsheet...');
    
    const response = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
    });

    if (!response.result) {
      throw new Error('Failed to access spreadsheet');
    }

    // If GID is provided, verify it exists
    if (gid) {
      const sheet = response.result.sheets?.find(
        (s: any) => s.properties?.sheetId === parseInt(gid)
      );
      
      if (!sheet) {
        throw new Error(`Sheet with GID ${gid} not found`);
      }
    }

    // Set up headers in the first row
    const range = gid 
      ? `${response.result.sheets?.find((s: any) => s.properties?.sheetId === parseInt(gid))?.properties?.title}!A1:Z1`
      : 'A1:Z1';

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [BASE_HEADERS]
      }
    });

    console.log('Spreadsheet initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing spreadsheet:', error);
    throw error;
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
    console.log('Starting sync with Google Sheets...');
    
    const { data: configData, error: configError } = await supabase
      .from('google_sheets_config')
      .select('header_mapping')
      .eq('spreadsheet_id', spreadsheetId)
      .maybeSingle();

    if (configError) throw configError;
    
    const headerMapping = (configData?.header_mapping || {}) as Record<string, string>;
    const { headers, data } = formatDataWithMapping(mediaItems, headerMapping);

    // Get the sheet name based on GID if provided
    let sheetName = SHEET_NAME;
    if (gid) {
      const response = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
      });
      
      const sheet = response.result.sheets?.find(
        (s: any) => s.properties?.sheetId === parseInt(gid)
      );
      
      if (sheet?.properties?.title) {
        sheetName = sheet.properties.title;
      }
    }

    // Clear existing data (except headers)
    const clearRange = `${sheetName}!A2:Z`;
    await window.gapi.client.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: clearRange,
    });

    // Update with new data
    const updateRange = `${sheetName}!A2:${String.fromCharCode(65 + headers.length)}${data.length + 1}`;
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: data
      }
    });

    console.log('Google Sheets sync successful');
    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};
