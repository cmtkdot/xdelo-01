import { Json } from '../base';

export interface GoogleSheetsConfig {
  Row: {
    id: string;
    user_id: string;
    spreadsheet_id: string;
    sheet_name?: string;
    sheet_gid?: string;
    auto_sync?: boolean;
    is_headers_mapped?: boolean;
    header_mapping?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    spreadsheet_id: string;
    sheet_name?: string;
    sheet_gid?: string;
    auto_sync?: boolean;
    is_headers_mapped?: boolean;
    header_mapping?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    spreadsheet_id?: string;
    sheet_name?: string;
    sheet_gid?: string;
    auto_sync?: boolean;
    is_headers_mapped?: boolean;
    header_mapping?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "google_sheets_config_user_id_fkey"
      columns: ["user_id"]
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
  ];
}