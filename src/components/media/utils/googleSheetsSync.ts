import { MediaItem } from "../types";
import { SHEET_NAME, formatMediaForSheets, BASE_HEADERS } from "./googleSheets/formatters";
import { supabase } from "@/integrations/supabase/client";

export const initGoogleSheetsAPI = async () => {
  try {
    if (!window.gapi?.client?.sheets) {
      throw new Error('Google Sheets API not initialized');
    }
    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    throw error;
  }
};

export const syncWithGoogleSheets = async (spreadsheetId: string, mediaItems: MediaItem[], gid?: string) => {
  try {
    console.log('Starting sync with Google Sheets...');
    
    if (!window.gapi?.client?.sheets) {
      throw new Error('Google Sheets API not initialized');
    }

    const { data: configData, error: configError } = await supabase
      .from('google_sheets_config')
      .select('header_mapping')
      .eq('spreadsheet_id', spreadsheetId)
      .maybeSingle();

    if (configError) throw configError;
    
    const headerMapping = (configData?.header_mapping || {}) as Record<string, string>;
    const formattedData = formatMediaForSheets(mediaItems, headerMapping);

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
    await window.gapi.client.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A2:Z`,
    });

    // Update with new data
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A2:${String.fromCharCode(65 + BASE_HEADERS.length)}${formattedData.length + 1}`,
      valueInputOption: 'RAW',
      resource: {
        values: formattedData
      }
    });

    console.log('Google Sheets sync successful');
    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};