export interface Expense {
  Row: {
    expenses_row_id?: string;
    expense_note?: string;
    amount?: string;
    category?: string;
    date?: string;
    uuid: number;
  };
  Insert: {
    expenses_row_id?: string;
    expense_note?: string;
    amount?: string;
    category?: string;
    date?: string;
    uuid: number;
  };
  Update: {
    expenses_row_id?: string;
    expense_note?: string;
    amount?: string;
    category?: string;
    date?: string;
    uuid?: number;
  };
  Relationships: [];
}