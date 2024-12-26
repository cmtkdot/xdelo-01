import { MediaItem } from "../../types";

export const SHEET_NAME = 'Media Data';

export const BASE_HEADERS = [
  'ID',
  'User ID',
  'Chat ID',
  'File Name',
  'File URL',
  'Media Type',
  'Caption',
  'Created At',
  'Updated At',
  'Media Group ID',
  'Google Drive ID',
  'Google Drive URL',
  'Chat Title',
  'Chat Username'
];

export const formatMediaForSheets = (mediaItems: MediaItem[], headerMapping: Record<string, string>) => {
  const reverseMapping: Record<string, string> = {};
  Object.entries(headerMapping).forEach(([sheetHeader, dbField]) => {
    reverseMapping[dbField] = sheetHeader;
  });

  return mediaItems.map(item => {
    const row = BASE_HEADERS.map(header => {
      const dbField = headerMapping[header];
      if (!dbField) return '';

      if (dbField.includes('.')) {
        const [parent, child] = dbField.split('.');
        return item[parent as keyof MediaItem]?.[child] || '';
      }

      return (item[dbField as keyof MediaItem] || '').toString();
    });

    return row;
  });
};