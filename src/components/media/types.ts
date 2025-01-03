export interface MediaItem {
  id: string;
  user_id: string;
  chat_id?: number;
  file_name: string;
  file_url: string;
  media_type: string;
  caption?: string;
  metadata?: Record<string, any> | string | null;
  created_at?: string;
  updated_at?: string;
  media_group_id?: string;
  additional_data?: Record<string, any>;
  google_drive_id?: string;
  google_drive_url?: string;
  public_url?: string;
  chat?: {
    title?: string;
    username?: string;
  };
}

export interface Channel {
  id?: string;  // Made optional since it's not always available from the API
  chat_id: number;
  title: string;
  username?: string;
}

export interface MediaFilter {
  selectedChannel: string;
  selectedType: string;
  uploadStatus: string;
}