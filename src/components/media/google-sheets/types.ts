export interface SpreadsheetConfig {
  id: string;
  name: string;
  autoSync: boolean;
  gid?: string;
  isHeadersMapped?: boolean;
}

export interface GoogleSheetsConfigProps {
  onSpreadsheetIdSet: (id: string) => void;
  selectedMedia?: any[];
  googleSheetId?: string | null;
  sheetsConfig?: any[];
}