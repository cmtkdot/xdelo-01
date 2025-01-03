import { MediaItem } from "../../types";

export const SHEET_NAME = 'MediaData';

export const BASE_HEADERS = [
  'File Name',
  'Type',
  'Channel',
  'Created At',
  'Caption',
  'Original File URL',
  'Google Drive URL',
  'Google Drive ID',
  'Last Updated',
  'Media Group ID',
  'Row ID',
  'Public URL'  // Added new column
];

// Format media data for Google Sheets
export const formatMediaForSheets = (items: MediaItem[]) => {
  const formattedData = items.map(item => [
    item.file_name,
    item.media_type,
    item.chat?.title || 'N/A',
    new Date(item.created_at || '').toLocaleString(),
    item.caption || 'No caption',
    item.file_url,
    item.google_drive_url || 'Not uploaded',
    item.google_drive_id || 'N/A',
    new Date(item.updated_at || '').toLocaleString(),
    item.media_group_id || 'N/A',
    item.id,
    item.public_url || 'No public URL'  // Added new field
  ]);

  return { headers: BASE_HEADERS, data: formattedData };
};