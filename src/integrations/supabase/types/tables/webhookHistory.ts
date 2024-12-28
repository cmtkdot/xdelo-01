export interface WebhookHistory {
  Row: {
    id: string;
    webhook_url_id: string;
    fields_sent: string[];
    schedule_type: string;
    status: string;
    media_count: number;
    sent_at?: string;
  };
  Insert: {
    id?: string;
    webhook_url_id: string;
    fields_sent: string[];
    schedule_type: string;
    status: string;
    media_count: number;
    sent_at?: string;
  };
  Update: {
    id?: string;
    webhook_url_id?: string;
    fields_sent?: string[];
    schedule_type?: string;
    status?: string;
    media_count?: number;
    sent_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "webhook_history_webhook_url_id_fkey"
      columns: ["webhook_url_id"]
      referencedRelation: "webhook_urls"
      referencedColumns: ["id"]
    }
  ];
}