import { Json } from '../base';

export interface GlideProducts {
  Row: {
    glide_product_row_id: string;
    product_data: Json;
    last_synced: string | null;
    created_at: string | null;
    updated_at: string | null;
    account_row_id: string | null;
    purchase_order_row_id: string | null;
    vpay_row_id: string | null;
    sheet21pics_row_id: string | null;
    product_choice_row_id: string | null;
    po_uid: string | null;
    product_name: string | null;
    vendor_uid: string | null;
    po_date: string | null;
    vendor_product_name: string | null;
    purchase_date: string | null;
    total_qty_purchased: number | null;
    cost: number | null;
    cost_update: number | null;
    is_sample: boolean | null;
    more_units_behind: boolean | null;
    is_fronted: boolean | null;
    rename_product: boolean | null;
    fronted_terms: string | null;
    total_units_behind_sample: number | null;
    leave_no: string | null;
    purchase_notes: string | null;
    is_miscellaneous: boolean | null;
    category: string | null;
    product_image_1: string | null;
    cart_note: string | null;
    cart_rename: boolean | null;
    submission_date: string | null;
    submitter_email: string | null;
    last_edited_date: string | null;
    supabase_media_id: string | null;
    supabase_video_link: string | null;
    supabase_caption: string | null;
    supabase_google_url: string | null;
  };
  Insert: {
    glide_product_row_id: string;
    product_data: Json;
    last_synced?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    account_row_id?: string | null;
    purchase_order_row_id?: string | null;
    vpay_row_id?: string | null;
    sheet21pics_row_id?: string | null;
    product_choice_row_id?: string | null;
    po_uid?: string | null;
    product_name?: string | null;
    vendor_uid?: string | null;
    po_date?: string | null;
    vendor_product_name?: string | null;
    purchase_date?: string | null;
    total_qty_purchased?: number | null;
    cost?: number | null;
    cost_update?: number | null;
    is_sample?: boolean | null;
    more_units_behind?: boolean | null;
    is_fronted?: boolean | null;
    rename_product?: boolean | null;
    fronted_terms?: string | null;
    total_units_behind_sample?: number | null;
    leave_no?: string | null;
    purchase_notes?: string | null;
    is_miscellaneous?: boolean | null;
    category?: string | null;
    product_image_1?: string | null;
    cart_note?: string | null;
    cart_rename?: boolean | null;
    submission_date?: string | null;
    submitter_email?: string | null;
    last_edited_date?: string | null;
    supabase_media_id?: string | null;
    supabase_video_link?: string | null;
    supabase_caption?: string | null;
    supabase_google_url?: string | null;
  };
  Update: {
    glide_product_row_id?: string;
    product_data?: Json;
    last_synced?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    account_row_id?: string | null;
    purchase_order_row_id?: string | null;
    vpay_row_id?: string | null;
    sheet21pics_row_id?: string | null;
    product_choice_row_id?: string | null;
    po_uid?: string | null;
    product_name?: string | null;
    vendor_uid?: string | null;
    po_date?: string | null;
    vendor_product_name?: string | null;
    purchase_date?: string | null;
    total_qty_purchased?: number | null;
    cost?: number | null;
    cost_update?: number | null;
    is_sample?: boolean | null;
    more_units_behind?: boolean | null;
    is_fronted?: boolean | null;
    rename_product?: boolean | null;
    fronted_terms?: string | null;
    total_units_behind_sample?: number | null;
    leave_no?: string | null;
    purchase_notes?: string | null;
    is_miscellaneous?: boolean | null;
    category?: string | null;
    product_image_1?: string | null;
    cart_note?: string | null;
    cart_rename?: boolean | null;
    submission_date?: string | null;
    submitter_email?: string | null;
    last_edited_date?: string | null;
    supabase_media_id?: string | null;
    supabase_video_link?: string | null;
    supabase_caption?: string | null;
    supabase_google_url?: string | null;
  };
  Relationships: [];
}