import { Json } from '../base';

export interface Media {
  Row: {
    id: string;
    user_id: string;
    chat_id?: number;
    file_name: string;
    file_url: string;
    media_type: string;
    caption?: string;
    metadata?: Json;
    created_at?: string;
    updated_at?: string;
    media_group_id?: string;
    additional_data?: Json;
    google_drive_id?: string;
    google_drive_url?: string;
    glide_row_id?: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    chat_id?: number;
    file_name: string;
    file_url: string;
    media_type: string;
    caption?: string;
    metadata?: Json;
    created_at?: string;
    updated_at?: string;
    media_group_id?: string;
    additional_data?: Json;
    google_drive_id?: string;
    google_drive_url?: string;
    glide_row_id?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    chat_id?: number;
    file_name?: string;
    file_url?: string;
    media_type?: string;
    caption?: string;
    metadata?: Json;
    created_at?: string;
    updated_at?: string;
    media_group_id?: string;
    additional_data?: Json;
    google_drive_id?: string;
    google_drive_url?: string;
    glide_row_id?: string;
  };
  Relationships: [
    {
      foreignKeyName: "fk_media_channel"
      columns: ["chat_id"]
      referencedRelation: "channels"
      referencedColumns: ["chat_id"]
    }
  ];
}