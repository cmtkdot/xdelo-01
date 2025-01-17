import { Json } from './base';

export interface DatabaseFunctions {
  execute_safe_query: {
    Args: { query_text: string };
    Returns: Json;
  };
  handle_message_upsert: {
    Args: Record<string, never>;
    Returns: unknown;
  };
  handle_new_user: {
    Args: Record<string, never>;
    Returns: unknown;
  };
  set_media_public_url: {
    Args: Record<string, never>;
    Returns: unknown;
  };
  update_media_references: {
    Args: Record<string, never>;
    Returns: unknown;
  };
  update_message_public_url: {
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