export const updateCaption = async (supabase: any, message: any) => {
  const { data: existingMedia, error: findError } = await supabase
    .from('media')
    .select('*')
    .eq('chat_id', message.chat.id)
    .contains('metadata', { message_id: message.message_id });

  if (findError) {
    console.error('Error finding existing media:', findError);
    return;
  }

  if (existingMedia?.[0]) {
    const { error: updateError } = await supabase
      .from('media')
      .update({ 
        caption: message.caption,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingMedia[0].id);

    if (updateError) {
      console.error('Error updating media caption:', updateError);
    }
  }
};