import { GlideProduct } from './types.ts';
import { parseDate, parseNumber } from './utils.ts';

export const mapGlideProductToSupabase = (product: GlideProduct) => {
  const values = product.values || {};
  console.log('Processing product:', product.id, 'with values:', values);
  
  return {
    glide_row_id: product.id,
    product_data: values,
    account_row_id: values["9aBFI"] || null,
    purchase_order_row_id: values["FoyGX"] || null,
    vpay_row_id: values["9ZlF5"] || null,
    sheet21pics_row_id: values["PIRCt"] || null,
    product_choice_row_id: values["JnZ0i"] || null,
    po_uid: values["qKFKb"] || null,
    product_name: values["Product Name"] || values["8rNtB"] || null,
    vendor_uid: values["0TFnd"] || null,
    po_date: parseDate(values["6KEY6"]),
    vendor_product_name: values["7vTwD"] || null,
    purchase_date: parseDate(values["j1byF"]),
    total_qty_purchased: parseNumber(values["2vbZN"]),
    cost: parseNumber(values["Cost"]),
    cost_update: parseNumber(values["2Oifn"]),
    is_sample: values["BtdUy"] || null,
    more_units_behind: values["zOV1T"] || null,
    is_fronted: values["PhXNJ"] || null,
    rename_product: values["TXvDh"] || null,
    fronted_terms: values["yGgnd"] || null,
    total_units_behind_sample: parseNumber(values["6ELPK"]),
    leave_no: values["sWTUg"] || null,
    purchase_notes: values["5Cedf"] || null,
    is_miscellaneous: values["edjhe"] || null,
    category: values["vccH4"] || null,
    product_image_1: values["Product Image 1"] || null,
    cart_note: values["qSE5p"] || null,
    cart_rename: values["pSr0T"] || null,
    submission_date: parseDate(values["SXT3o"]),
    submitter_email: values["RD7cH"] || null,
    last_edited_date: parseDate(values["t9wgm"]),
    supabase_media_id: values["eb7jA"] || null,
    supabase_video_link: values["Qr1Tl"] || null,
    supabase_caption: values["zwLpG"] || null,
    supabase_google_url: values["iIFAY"] || null,
    last_synced: new Date().toISOString(),
  };
};