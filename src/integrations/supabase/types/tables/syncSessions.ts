import { Json } from '../base';

export interface SyncSessions {
  Row: {
    id: string;
    channel_id?: number;
    status: string;
    progress?: Json;
    started_at: string;
    updated_at?: string;
    completed_at?: string;
    final_count?: number;
    created_at?: string;
  };
  Insert: {
    id?: string;
    channel_id?: number;
    status: string;
    progress?: Json;
    started_at?: string;
    updated_at?: string;
    completed_at?: string;
    final_count?: number;
    created_at?: string;
  };
  Update: {
    id?: string;
    channel_id?: number;
    status?: string;
    progress?: Json;
    started_at?: string;
    updated_at?: string;
    completed_at?: string;
    final_count?: number;
    created_at?: string;
  };
}