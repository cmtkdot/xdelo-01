export interface Config {
  Row: {
    key: string;
    value: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    key: string;
    value: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    key?: string;
    value?: string;
    created_at?: string;
    updated_at?: string;
  };
}