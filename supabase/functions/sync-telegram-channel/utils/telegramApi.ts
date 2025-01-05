import { corsHeaders } from "../../_shared/cors.ts";

export async function verifyChannelAccess(botToken: string, chatId: number): Promise<boolean> {
  console.log(`[verifyChannelAccess] Verifying access for channel ${chatId}`);
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to verify channel access:', errorText);
      throw new Error(`Failed to verify channel access: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[verifyChannelAccess] Successfully verified access for channel ${chatId}`);
    return true;
  } catch (error) {
    console.error(`[verifyChannelAccess] Error verifying channel access:`, error);
    throw error;
  }
}

export async function getChannelMessages(botToken: string, chatId: number, offset = 0): Promise<any[]> {
  console.log(`[getChannelMessages] Getting messages for channel ${chatId} with offset ${offset}`);
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getUpdates`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          offset: offset,
          limit: 100,
          allowed_updates: ["channel_post", "message"]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return [];
    }

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Error getting channel messages:', error);
    throw error;
  }
}

export async function forwardMessage(
  botToken: string, 
  sourceChatId: number, 
  destinationChatId: number, 
  messageId: number
): Promise<any> {
  console.log(`[forwardMessage] Forwarding message ${messageId} from ${sourceChatId} to ${destinationChatId}`);
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/forwardMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: destinationChatId,
          from_chat_id: sourceChatId,
          message_id: messageId,
          disable_notification: true
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to forward message:', errorText);
      throw new Error(`Failed to forward message: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[forwardMessage] Successfully forwarded message ${messageId}`);
    return data.result;
  } catch (error) {
    console.error(`[forwardMessage] Error forwarding message:`, error);
    throw error;
  }
}