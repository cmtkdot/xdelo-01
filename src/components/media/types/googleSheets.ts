import { MediaItem } from "../types";

export interface SpreadsheetConfig {
  id: string;
  name: string;
  autoSync: boolean;
  gid?: string;
  isHeadersMapped?: boolean;
}

export interface GoogleSheetsConfigProps {
  onSpreadsheetIdSet: (id: string) => void;
  selectedMedia?: MediaItem[];
  googleSheetId?: string | null;
  sheetsConfig?: any[];
}

export interface SpreadsheetCardProps {
  sheet: SpreadsheetConfig;
  onToggleAutoSync: (id: string) => void;
  onRemove: (id: string) => void;
  onHeaderMappingComplete: (id: string, mapping: Record<string, string>) => void;
}