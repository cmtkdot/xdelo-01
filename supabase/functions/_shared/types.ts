export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
  mime_type?: string;
}

export interface MediaMetadata {
  file_id: string;
  file_unique_id: string;
  message_id: number;
  media_group_id?: string;
  content_type?: string;
  mime_type?: string;
  file_size?: number;
  file_path?: string;
}

export interface SyncResult {
  success: boolean;
  mediaData?: any;
  publicUrl?: string;
  error?: string;
}