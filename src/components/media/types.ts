import { Database } from "@/integrations/supabase/types";

export type MediaMetadata = {
  telegram_file_id: string;
  width: number;
  height: number;
  file_size: number;
  message_id?: number; // Added this field
};

export type MediaItem = Database['public']['Tables']['media']['Row'] & {
  metadata: MediaMetadata | null;
  chat?: {
    title: string;
    username: string;
  };
  google_drive_id?: string;
  google_drive_url?: string;
};

export type Channel = {
  title: string;
  chat_id: number;
};

export type MediaFilter = {
  selectedChannel: string;
  selectedType: string;
  uploadStatus: string;
};