import { Json } from '../base';

export interface AITrainingData {
  Row: {
    id: string;
    user_id: string;
    category: string;
    title: string;
    content: string;
    metadata: Json;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    category: string;
    title: string;
    content: string;
    metadata?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    category?: string;
    title?: string;
    content?: string;
    metadata?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "ai_training_data_user_id_fkey"
      columns: ["user_id"]
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
  ];
}