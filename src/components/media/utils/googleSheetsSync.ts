import { MediaItem } from "../types";
import { initGoogleSheetsAPI } from "./googleSheets/auth";

export const syncWithGoogleSheets = async (
  spreadsheetId: string,
  mediaItems: MediaItem[],
  gid?: string,
  columns: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
) => {
  try {
    await initGoogleSheetsAPI();

    // Format data for sheets
    const formattedData = mediaItems.map(item => [
      item.file_name,
      item.media_type,
      item.chat?.title || '',
      new Date(item.created_at).toLocaleString(),
      item.caption || '',
      item.file_url,
      item.google_drive_url || '',
      item.google_drive_id || ''
    ]);

    // Update spreadsheet
    const range = `A2:${columns[columns.length - 1]}${formattedData.length + 1}`;
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: formattedData
      }
    });

    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    throw error;
  }
};