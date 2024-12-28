export interface WebhookUrls {
  Row: {
    id: string;
    user_id: string;
    name: string;
    url: string;
    created_at?: string;
    updated_at?: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    name: string;
    url: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    name?: string;
    url?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "webhook_urls_user_id_fkey"
      columns: ["user_id"]
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
  ];
}