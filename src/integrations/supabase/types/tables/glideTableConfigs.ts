export type SyncDirection = 'glide_to_supabase' | 'supabase_to_glide' | 'bidirectional';

export interface GlideTableConfigs {
  Row: {
    id: string;
    app_id: string;
    table_id: string;
    table_name: string;
    sync_direction: SyncDirection;
    sync_interval: number | null;
    is_active: boolean | null;
    last_synced: string | null;
    created_at: string | null;
    updated_at: string | null;
    column_mapping: Record<string, any> | null;
    validation_rules: Record<string, any> | null;
  };
  Insert: {
    id?: string;
    app_id: string;
    table_id: string;
    table_name: string;
    sync_direction?: SyncDirection;
    sync_interval?: number | null;
    is_active?: boolean | null;
    last_synced?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    column_mapping?: Record<string, any> | null;
    validation_rules?: Record<string, any> | null;
  };
  Update: {
    id?: string;
    app_id?: string;
    table_id?: string;
    table_name?: string;
    sync_direction?: SyncDirection;
    sync_interval?: number | null;
    is_active?: boolean | null;
    last_synced?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    column_mapping?: Record<string, any> | null;
    validation_rules?: Record<string, any> | null;
  };
}