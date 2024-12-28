export interface GlideProduct {
  $rowID: string;
  values: {
    "9aBFI"?: string; // account_row_id
    "FoyGX"?: string; // purchase_order_row_id
    "9ZlF5"?: string; // vpay_row_id
    "PIRCt"?: string; // sheet21pics_row_id
    "JnZ0i"?: string; // product_choice_row_id
    "qKFKb"?: string; // po_uid
    "Product Name"?: string;
    "0TFnd"?: string; // vendor_uid
    "6KEY6"?: string; // po_date
    "8rNtB"?: string; // product_name
    "7vTwD"?: string; // vendor_product_name
    "j1byF"?: string; // purchase_date
    "2vbZN"?: number; // total_qty_purchased
    "Cost"?: number;
    "2Oifn"?: number; // cost_update
    "BtdUy"?: boolean; // is_sample
    "zOV1T"?: boolean; // more_units_behind
    "PhXNJ"?: boolean; // is_fronted
    "TXvDh"?: boolean; // rename_product
    "yGgnd"?: string; // fronted_terms
    "6ELPK"?: number; // total_units_behind_sample
    "sWTUg"?: string; // leave_no
    "5Cedf"?: string; // purchase_notes
    "edjhe"?: boolean; // is_miscellaneous
    "vccH4"?: string; // category
    "Product Image 1"?: string;
    "qSE5p"?: string; // cart_note
    "pSr0T"?: boolean; // cart_rename
    "SXT3o"?: string; // submission_date
    "RD7cH"?: string; // submitter_email
    "t9wgm"?: string; // last_edited_date
    "eb7jA"?: string; // supabase_media_id
    "Qr1Tl"?: string; // supabase_video_link
    "zwLpG"?: string; // supabase_caption
    "iIFAY"?: string; // supabase_google_url
  };
}

export interface GlideResponse {
  rows: Array<Record<string, any>>;
}