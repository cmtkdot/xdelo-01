import { Json } from './base';

export interface DatabaseFunctions {
  execute_safe_query: {
    Args: { query_text: string };
    Returns: Json;
  };
  get_media_data: {
    Args: Record<string, never>;
    Returns: Json;
  };
  handle_new_user: {
    Args: Record<string, never>;
    Returns: unknown;
  };
  handle_updated_at: {
    Args: Record<string, never>;
    Returns: unknown;
  };
  update_updated_at_column: {
    Args: Record<string, never>;
    Returns: unknown;
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