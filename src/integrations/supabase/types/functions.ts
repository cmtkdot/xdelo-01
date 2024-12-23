import { Json } from './base';

export interface DatabaseFunctions {
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