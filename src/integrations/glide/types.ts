export interface GlideTableColumn {
  type: string;
  name: string;
}

export interface GlideTableConfig {
  token: string;
  app: string;
  table: string;
  columns: Record<string, GlideTableColumn>;
}

export interface GlideTableOperation {
  type: 'get' | 'add' | 'update' | 'delete';
  data?: Record<string, any>;
  rowId?: string;
}