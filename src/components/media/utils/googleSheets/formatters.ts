import { MediaItem } from "../../types";

export const SHEET_NAME = 'MediaData';

export const BASE_HEADERS = [
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
export const formatMediaForSheets = (items: MediaItem[]) => {
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