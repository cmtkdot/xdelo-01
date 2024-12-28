import { GlideProduct } from './types.ts';
import { parseDate, parseNumber } from './utils.ts';

export const mapGlideProductToSupabase = (product: Record<string, any>) => {
  console.log('Processing product:', product);
  
  // Ensure glide_product_row_id is set from the $rowID
  if (!product.$rowID) {
    console.warn('Product is missing $rowID:', product);
    throw new Error('Product $rowID is required');
  }

  return {
    glide_product_row_id: product.$rowID,
    product_data: product,
    account_row_id: product["9aBFI"] || null,
    purchase_order_row_id: product["FoyGX"] || null,
    vpay_row_id: product["9ZlF5"] || null,
    sheet21pics_row_id: product["PIRCt"] || null,
    product_choice_row_id: product["JnZ0i"] || null,
    po_uid: product["qKFKb"] || null,
    product_name: product["Product Name"] || product["8rNtB"] || null,
    vendor_uid: product["0TFnd"] || null,
    po_date: parseDate(product["6KEY6"]),
    vendor_product_name: product["7vTwD"] || null,
    purchase_date: parseDate(product["j1byF"]),
    total_qty_purchased: parseNumber(product["2vbZN"]), // This will now handle decimal values
    cost: parseNumber(product["Cost"]),
    cost_update: parseNumber(product["2Oifn"]),
    is_sample: product["BtdUy"] || null,
    more_units_behind: product["zOV1T"] || null,
    is_fronted: product["PhXNJ"] || null,
    rename_product: product["TXvDh"] || null,
    fronted_terms: product["yGgnd"] || null,
    total_units_behind_sample: parseNumber(product["6ELPK"]),
    leave_no: product["sWTUg"] || null,
    purchase_notes: product["5Cedf"] || null,
    is_miscellaneous: product["edjhe"] || null,
    category: product["vccH4"] || null,
    product_image_1: product["Product Image 1"] || null,
    cart_note: product["qSE5p"] || null,
    cart_rename: product["pSr0T"] || null,
    submission_date: parseDate(product["SXT3o"]),
    submitter_email: product["RD7cH"] || null,
    last_edited_date: parseDate(product["t9wgm"]),
    supabase_media_id: product["eb7jA"] || null,
    supabase_video_link: product["Qr1Tl"] || null,
    supabase_caption: product["zwLpG"] || null,
    supabase_google_url: product["iIFAY"] || null,
    last_synced: new Date().toISOString(),
  };
};