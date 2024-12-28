export interface BotUsers {
  Row: {
    id: string;
    telegram_user_id?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    created_at?: string;
    updated_at?: string;
  };
  Insert: {
    id: string;
    telegram_user_id?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    telegram_user_id?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "bot_users_id_fkey"
      columns: ["id"]
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
  ];
}