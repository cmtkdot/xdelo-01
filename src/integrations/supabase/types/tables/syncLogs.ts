import { Json } from '../base';

export interface SyncLogs {
  Row: {
    id: string;
    user_id: string;
    channel_id?: string;
    sync_type: string;
    status: string;
    progress?: number;
    details?: Json;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
    created_at?: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    channel_id?: string;
    sync_type: string;
    status: string;
    progress?: number;
    details?: Json;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
    created_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    channel_id?: string;
    sync_type?: string;
    status?: string;
    progress?: number;
    details?: Json;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
    created_at?: string;
  };
}