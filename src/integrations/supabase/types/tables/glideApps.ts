export interface GlideApps {
  Row: {
    id: string;
    app_id: string;
    app_name: string;
    display_order: number | null;
    created_at: string | null;
    updated_at: string | null;
    is_active: boolean | null;
  };
  Insert: {
    id?: string;
    app_id: string;
    app_name: string;
    display_order?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
    is_active?: boolean | null;
  };
  Update: {
    id?: string;
    app_id?: string;
    app_name?: string;
    display_order?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
    is_active?: boolean | null;
  };
}