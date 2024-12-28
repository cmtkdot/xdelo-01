import { Json } from '../base';

export interface WebhookConfigurations {
  Row: {
    id: string;
    user_id: string;
    webhook_url_id: string;
    name: string;
    method: string;
    headers?: Json;
    body_params?: Json;
    query_params?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    webhook_url_id: string;
    name: string;
    method: string;
    headers?: Json;
    body_params?: Json;
    query_params?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    webhook_url_id?: string;
    name?: string;
    method?: string;
    headers?: Json;
    body_params?: Json;
    query_params?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "webhook_configurations_user_id_fkey"
      columns: ["user_id"]
      referencedRelation: "users"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "webhook_configurations_webhook_url_id_fkey"
      columns: ["webhook_url_id"]
      referencedRelation: "webhook_urls"
      referencedColumns: ["id"]
    }
  ];
}