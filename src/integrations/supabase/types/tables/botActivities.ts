import { Json } from '../base';

export interface BotActivities {
  Row: {
    id: string;
    event_type: string;
    chat_id: number;
    user_id?: string;
    message_id?: number;
    details?: Json;
    created_at?: string;
    message_type?: string;
  };
  Insert: {
    id?: string;
    event_type: string;
    chat_id: number;
    user_id?: string;
    message_id?: number;
    details?: Json;
    created_at?: string;
    message_type?: string;
  };
  Update: {
    id?: string;
    event_type?: string;
    chat_id?: number;
    user_id?: string;
    message_id?: number;
    details?: Json;
    created_at?: string;
    message_type?: string;
  };
  Relationships: [
    {
      foreignKeyName: "bot_activities_chat_id_fkey"
      columns: ["chat_id"]
      referencedRelation: "channels"
      referencedColumns: ["chat_id"]
    }
  ];
}