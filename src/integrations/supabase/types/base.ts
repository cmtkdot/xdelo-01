export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_training_data: AITrainingData;
      bot_activities: BotActivities;
      bot_users: BotUsers;
      channels: Channels;
      media: Media;
      messages: Messages;
      webhook_urls: WebhookUrls;
      webhook_history: WebhookHistory;
    };
    Views: {};
    Functions: DatabaseFunctions;
    Enums: {};
    CompositeTypes: {};
  };
};

interface AITrainingData {
  Row: {
    id: string;
    user_id: string;
    category: string;
    title: string;
    content: string;
    metadata: Json | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    user_id: string;
    category: string;
    title: string;
    content: string;
    metadata?: Json | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string;
    category?: string;
    title?: string;
    content?: string;
    metadata?: Json | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [];
}

interface BotActivities {
  Row: {
    id: string;
    event_type: string;
    chat_id: number;
    user_id: string | null;
    message_id: number | null;
    details: Json | null;
    created_at: string | null;
    message_type: string | null;
  };
  Insert: {
    id?: string;
    event_type: string;
    chat_id: number;
    user_id?: string | null;
    message_id?: number | null;
    details?: Json | null;
    created_at?: string | null;
    message_type?: string | null;
  };
  Update: {
    id?: string;
    event_type?: string;
    chat_id?: number;
    user_id?: string | null;
    message_id?: number | null;
    details?: Json | null;
    created_at?: string | null;
    message_type?: string | null;
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

interface BotUsers {
  Row: {
    id: string;
    telegram_user_id: string | null;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id: string;
    telegram_user_id?: string | null;
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    telegram_user_id?: string | null;
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [];
}

interface Channels {
  Row: {
    id: string;
    user_id: string;
    chat_id: number;
    title: string;
    username: string | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    user_id: string;
    chat_id: number;
    title: string;
    username?: string | null;
    is_active?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string;
    chat_id?: number;
    title?: string;
    username?: string | null;
    is_active?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [];
}

interface Media {
  Row: {
    id: string;
    user_id: string;
    chat_id: number | null;
    file_name: string;
    file_url: string;
    media_type: string;
    caption: string | null;
    metadata: Json | null;
    created_at: string | null;
    updated_at: string | null;
    media_group_id: string | null;
    additional_data: Json | null;
  };
  Insert: {
    id?: string;
    user_id: string;
    chat_id?: number | null;
    file_name: string;
    file_url: string;
    media_type: string;
    caption?: string | null;
    metadata?: Json | null;
    created_at?: string | null;
    updated_at?: string | null;
    media_group_id?: string | null;
    additional_data?: Json | null;
  };
  Update: {
    id?: string;
    user_id?: string;
    chat_id?: number | null;
    file_name?: string;
    file_url?: string;
    media_type?: string;
    caption?: string | null;
    metadata?: Json | null;
    created_at?: string | null;
    updated_at?: string | null;
    media_group_id?: string | null;
    additional_data?: Json | null;
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

interface Messages {
  Row: {
    id: string;
    user_id: string;
    chat_id: number | null;
    message_id: number;
    sender_name: string;
    text: string | null;
    media_type: string | null;
    media_url: string | null;
    created_at: string | null;
  };
  Insert: {
    id?: string;
    user_id: string;
    chat_id?: number | null;
    message_id: number;
    sender_name: string;
    text?: string | null;
    media_type?: string | null;
    media_url?: string | null;
    created_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string;
    chat_id?: number | null;
    message_id?: number;
    sender_name?: string;
    text?: string | null;
    media_type?: string | null;
    media_url?: string | null;
    created_at?: string | null;
  };
  Relationships: [];
}

interface WebhookUrls {
  Row: {
    id: string;
    user_id: string;
    name: string;
    url: string;
    created_at: string | null;
    updated_at: string | null;
  };
  Insert: {
    id?: string;
    user_id: string;
    name: string;
    url: string;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string;
    name?: string;
    url?: string;
    created_at?: string | null;
    updated_at?: string | null;
  };
  Relationships: [];
}

interface WebhookHistory {
  Row: {
    id: string;
    webhook_url_id: string;
    fields_sent: string[];
    schedule_type: string;
    status: string;
    media_count: number;
    sent_at: string | null;
  };
  Insert: {
    id?: string;
    webhook_url_id: string;
    fields_sent: string[];
    schedule_type: string;
    status: string;
    media_count: number;
    sent_at?: string | null;
  };
  Update: {
    id?: string;
    webhook_url_id?: string;
    fields_sent?: string[];
    schedule_type?: string;
    status?: string;
    media_count?: number;
    sent_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: "webhook_history_webhook_url_id_fkey";
      columns: ["webhook_url_id"];
      isOneToOne: false;
      referencedRelation: "webhook_urls";
      referencedColumns: ["id"];
    }
  ];
}

interface DatabaseFunctions {
  execute_safe_query: {
    Args: {
      query_text: string;
    };
    Returns: Json;
  };
  get_media_data: {
    Args: Record<PropertyKey, never>;
    Returns: Json;
  };
  upload_media: {
    Args: {
      p_user_id: string;
      p_chat_id: number;
      p_file_name: string;
      p_media_type: string;
      p_caption?: string;
    };
    Returns: string;
  };
}