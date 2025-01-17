import type { Database } from '@/integrations/supabase/types';

export type GlideApp = Database['public']['Tables']['glide_apps']['Row'];
export type GlideTableConfig = Database['public']['Tables']['glide_table_configs']['Row'];
export type GlideProduct = Database['public']['Tables']['glide_products']['Row'];

export interface GlideTableData {
  id: string;
  [key: string]: any;
}