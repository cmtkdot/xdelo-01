export interface GlideApp {
  id: string;
  app_id: string;
  app_name: string;
  display_order: number | null;
  created_at: string | null;
  updated_at: string | null;
  is_active: boolean | null;
}

export interface GlideTableConfig {
  id: string;
  app_id: string;
  table_id: string;
  table_name: string;
  sync_direction: 'unidirectional' | 'bidirectional';
  sync_interval: number;
  is_active: boolean;
  last_synced: string | null;
  created_at: string | null;
  updated_at: string | null;
  column_mapping: Record<string, any>;
  validation_rules: Record<string, any>;
}

export interface GlideTableData {
  id: string;
  [key: string]: any;
}