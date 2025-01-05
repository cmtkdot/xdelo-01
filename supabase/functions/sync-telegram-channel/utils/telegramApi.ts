import { corsHeaders } from "../../_shared/cors.ts";

export async function verifyChannelAccess(botToken: string, chatId: number) {
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
      console.error('Error verifying channel access:', errorText);
      throw new Error(`Failed to verify channel access: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error in verifyChannelAccess:', error);
    throw error;
  }
}

export async function getChannelMessages(botToken: string, chatId: number, offset = 0) {
  console.log(`[getChannelMessages] Getting messages for channel ${chatId}, offset: ${offset}`);
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMessages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          offset: offset,
          limit: 100
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error getting channel messages:', errorText);
      
      // If webhook is active, try to delete it first
      if (response.status === 409) {
        console.log('Webhook conflict detected, attempting to delete webhook...');
        await deleteWebhook(botToken);
        // Retry the original request
        return getChannelMessages(botToken, chatId, offset);
      }
      
      throw new Error({
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
    }

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Error in getChannelMessages:', error);
    throw error;
  }
}

async function deleteWebhook(botToken: string) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/deleteWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error deleting webhook:', errorText);
      throw new Error(`Failed to delete webhook: ${response.statusText}`);
    }

    console.log('Successfully deleted webhook');
    return true;
  } catch (error) {
    console.error('Error in deleteWebhook:', error);
    throw error;
  }
}

export async function forwardMessage(botToken: string, fromChatId: number, toChatId: number, messageId: number) {
  console.log(`[forwardMessage] Forwarding message ${messageId} from ${fromChatId} to ${toChatId}`);
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/forwardMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: toChatId,
          from_chat_id: fromChatId,
          message_id: messageId,
          disable_notification: true
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error forwarding message:', errorText);
      throw new Error(`Failed to forward message: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error in forwardMessage:', error);
    throw error;
  }
}