export interface Channels {
  Row: {
    id: string;
    user_id: string;
    chat_id: number;
    title: string;
    username?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    chat_id: number;
    title: string;
    username?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    chat_id?: number;
    title?: string;
    username?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [];
}