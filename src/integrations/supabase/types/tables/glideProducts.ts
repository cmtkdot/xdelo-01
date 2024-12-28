import { Json } from '../base';

export interface GlideProducts {
  Row: {
    glide_row_id: string;
    product_data: Json;
    last_synced: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    glide_row_id: string;
    product_data: Json;
    last_synced?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    glide_row_id?: string;
    product_data?: Json;
    last_synced?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [];
}