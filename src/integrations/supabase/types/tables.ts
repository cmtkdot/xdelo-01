import { Json } from './base';

export interface AITrainingDataTable {
  Row: {
    category: string;
    content: string;
    created_at: string | null;
    id: string;
    metadata: Json | null;
    title: string;
    updated_at: string | null;
    user_id: string;
  };
  Insert: {
    category: string;
    content: string;
    created_at?: string | null;
    id?: string;
    metadata?: Json | null;
    title: string;
    updated_at?: string | null;
    user_id: string;
  };
  Update: {
    category?: string;
    content?: string;
    created_at?: string | null;
    id?: string;
    metadata?: Json | null;
    title?: string;
    updated_at?: string | null;
    user_id?: string;
  };
  Relationships: [];
}

export interface BotActivitiesTable {
  Row: {
    chat_id: number;
    created_at: string | null;
    details: Json | null;
    event_type: string;
    id: string;
    message_id: number | null;
    message_type: string | null;
    user_id: string | null;
  };
  Insert: {
    chat_id: number;
    created_at?: string | null;
    details?: Json | null;
    event_type: string;
    id?: string;
    message_id?: number | null;
    message_type?: string | null;
    user_id?: string | null;
  };
  Update: {
    chat_id?: number;
    created_at?: string | null;
    details?: Json | null;
    event_type?: string;
    id?: string;
    message_id?: number | null;
    message_type?: string | null;
    user_id?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: "bot_activities_chat_id_fkey";
      columns: ["chat_id"];
      isOneToOne: false;
      referencedRelation: "channels";
      referencedColumns: ["chat_id"];
    }
  ];
}

export interface BotUsersTable {
  Row: {
    created_at: string | null;
    first_name: string | null;
    id: string;
    last_name: string | null;
    telegram_user_id: string | null;
    updated_at: string | null;
    username: string | null;
  };
  Insert: {
    created_at?: string | null;
    first_name?: string | null;
    id: string;
    last_name?: string | null;
    telegram_user_id?: string | null;
    updated_at?: string | null;
    username?: string | null;
  };
  Update: {
    created_at?: string | null;
    first_name?: string | null;
    id?: string;
    last_name?: string | null;
    telegram_user_id?: string | null;
    updated_at?: string | null;
    username?: string | null;
  };
  Relationships: [];
}

export interface ChannelsTable {
  Row: {
    chat_id: number;
    created_at: string | null;
    id: string;
    is_active: boolean | null;
    title: string;
    updated_at: string | null;
    user_id: string;
    username: string | null;
  };
  Insert: {
    chat_id: number;
    created_at?: string | null;
    id?: string;
    is_active?: boolean | null;
    title: string;
    updated_at?: string | null;
    user_id: string;
    username?: string | null;
  };
  Update: {
    chat_id?: number;
    created_at?: string | null;
    id?: string;
    is_active?: boolean | null;
    title?: string;
    updated_at?: string | null;
    user_id?: string;
    username?: string | null;
  };
  Relationships: [];
}

export interface MediaTable {
  Row: {
    additional_data: Json | null;
    caption: string | null;
    chat_id: number | null;
    created_at: string | null;
    file_name: string;
    file_url: string;
    id: string;
    media_group_id: string | null;
    media_type: string;
    metadata: Json | null;
    updated_at: string | null;
    user_id: string;
  };
  Insert: {
    additional_data?: Json | null;
    caption?: string | null;
    chat_id?: number | null;
    created_at?: string | null;
    file_name: string;
    file_url: string;
    id?: string;
    media_group_id?: string | null;
    media_type: string;
    metadata?: Json | null;
    updated_at?: string | null;
    user_id: string;
  };
  Update: {
    additional_data?: Json | null;
    caption?: string | null;
    chat_id?: number | null;
    created_at?: string | null;
    file_name?: string;
    file_url?: string;
    id?: string;
    media_group_id?: string | null;
    media_type?: string;
    metadata?: Json | null;
    updated_at?: string | null;
    user_id?: string;
  };
  Relationships: [
    {
      foreignKeyName: "fk_media_channel";
      columns: ["chat_id"];
      isOneToOne: false;
      referencedRelation: "channels";
      referencedColumns: ["chat_id"];
    }
  ];
}

export interface MessagesTable {
  Row: {
    chat_id: number | null;
    created_at: string | null;
    id: string;
    media_type: string | null;
    media_url: string | null;
    message_id: number;
    sender_name: string;
    text: string | null;
    user_id: string;
  };
  Insert: {
    chat_id?: number | null;
    created_at?: string | null;
    id?: string;
    media_type?: string | null;
    media_url?: string | null;
    message_id: number;
    sender_name: string;
    text?: string | null;
    user_id: string;
  };
  Update: {
    chat_id?: number | null;
    created_at?: string | null;
    id?: string;
    media_type?: string | null;
    media_url?: string | null;
    message_id?: number;
    sender_name?: string;
    text?: string | null;
    user_id?: string;
  };
  Relationships: [];
}