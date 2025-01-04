import { Json } from '@/integrations/supabase/types';

export interface MediaItem {
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
  public_url?: string;
  chat?: {
    title: string;
    username?: string;
  };
}

export interface Channel {
  id?: string;
  chat_id: number;
  title: string;
  username?: string;
}

export interface MediaFilter {
  selectedChannel: string;
  selectedType: string;
  uploadStatus: string;
}

export interface SyncLog {
  id: string;
  user_id: string;
  channel_id: string;
  sync_type: string;
  status: string;
  progress: number;
  details: Json;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
}

export interface SyncStatus {
  progress: number;
  status: string;
  completed_at?: string;
  error_message?: string;
}