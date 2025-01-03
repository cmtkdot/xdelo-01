import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const saveChannel = async (supabase: any, chat: any, userId: string) => {
  const { error: channelError } = await supabase
    .from('channels')
    .upsert({
      user_id: userId,
      chat_id: chat.id,
      title: chat.title,
      username: chat.username,
    }, {
      onConflict: 'chat_id',
      ignoreDuplicates: false,
    });

  if (channelError) {
    console.error('Error saving channel:', channelError);
    throw channelError;
  }
};

export const saveMessage = async (supabase: any, chat: any, message: any, userId: string) => {
  const { error: messageError } = await supabase
    .from('messages')
    .insert({
      user_id: userId,
      chat_id: chat.id,
      message_id: message.message_id,
      sender_name: message.from?.username || message.from?.first_name || 'Unknown',
      text: message.text || message.caption,
    });

  if (messageError) {
    console.error('Error saving message:', messageError);
    throw messageError;
  }
};

export const saveBotUser = async (
  supabase: any, 
  userId: string, 
  telegramUserId: string | null, 
  username: string | null, 
  firstName: string | null, 
  lastName: string | null
) => {
  // Only attempt to save if we have a telegram user ID
  if (!telegramUserId) {
    console.log('No telegram user ID provided, skipping bot user creation');
    return;
  }

  try {
    const { error: botUserError } = await supabase
      .from('bot_users')
      .upsert({
        id: userId,
        telegram_user_id: telegramUserId,
        username: username,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'telegram_user_id',
        ignoreDuplicates: false,
      });

    if (botUserError) {
      console.error('Error creating/updating bot user:', botUserError);
      // Log the attempted data for debugging
      console.log('Attempted bot user data:', {
        id: userId,
        telegram_user_id: telegramUserId,
        username,
        firstName,
        lastName
      });
      throw botUserError;
    }
  } catch (error) {
    console.error('Error in saveBotUser:', error);
    // Don't throw the error - we want the webhook to continue processing
    // even if bot user creation fails
  }
};

export const saveMedia = async (
  supabase: any,
  userId: string,
  chatId: number,
  fileName: string,
  fileUrl: string,
  mediaType: string,
  caption: string | null,
  metadata: any,
  mediaGroupId: string | null,
  googleDriveId: string | null,
  googleDriveUrl: string | null,
  publicUrl: string | null
) => {
  console.log('Saving media with public URL:', publicUrl);
  
  const { data: mediaData, error: mediaError } = await supabase
    .from('media')
    .insert({
      user_id: userId,
      chat_id: chatId,
      file_name: fileName,
      file_url: fileUrl,
      media_type: mediaType,
      caption: caption,
      metadata: metadata,
      media_group_id: mediaGroupId,
      google_drive_id: googleDriveId,
      google_drive_url: googleDriveUrl,
      public_url: publicUrl,
    })
    .select()
    .single();

  if (mediaError) {
    console.error('Error saving media:', mediaError);
    throw mediaError;
  }

  return mediaData;
};