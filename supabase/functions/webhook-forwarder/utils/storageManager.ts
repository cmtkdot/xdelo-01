export async function deleteFromStorage(supabase: any, fileName: string): Promise<void> {
  console.log(`[deleteFromStorage] Deleting file: ${fileName}`);
  
  const { error } = await supabase.storage
    .from('telegram-media')
    .remove([fileName]);
  
  if (error) {
    console.error('[deleteFromStorage] Error deleting file:', error);
    throw error;
  }
}