export interface Messages {
  Row: {
    id: string;
    user_id: string;
    chat_id?: number;
    message_id: number;
    sender_name: string;
    text?: string;
    media_type?: string;
    media_url?: string;
    created_at?: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    chat_id?: number;
    message_id: number;
    sender_name: string;
    text?: string;
    media_type?: string;
    media_url?: string;
    created_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    chat_id?: number;
    message_id?: number;
    sender_name?: string;
    text?: string;
    media_type?: string;
    media_url?: string;
    created_at?: string;
  };
  Relationships: [];
}