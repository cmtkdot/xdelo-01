import { logOperation } from "../../_shared/database.ts";
import { getAndDownloadTelegramFile } from "../../_shared/telegram.ts";
import { uploadToStorage, generateSafeFileName } from "../../_shared/storage.ts";

export async function verifyChannelAccess(botToken: string, channelId: number) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getChat?chat_id=${channelId}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Error verifying channel access:', error);
    throw new Error(`Failed to access channel: ${error.description}`);
  }
  
  return await response.json();
}

export async function getChannelHistory(botToken: string, channelId: number, offset = 0, limit = 100) {
  console.log(`Fetching message history for channel ${channelId} from offset ${offset}`);
  
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getHistory?chat_id=${channelId}&offset=${offset}&limit=${limit}`
  );

  if (!response.ok) {
    // If getHistory fails, try getChatHistory
    console.log('getHistory failed, trying getChatHistory...');
    const chatHistoryResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatHistory?chat_id=${channelId}&offset=${offset}&limit=${limit}`
    );

    if (!chatHistoryResponse.ok) {
      // If both fail, try getMessages as last resort
      console.log('getChatHistory failed, trying getMessages...');
      const messagesResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getMessages?chat_id=${channelId}&offset_id=${offset}&limit=${limit}`
      );
      
      if (!messagesResponse.ok) {
        const error = await messagesResponse.json();
        console.error('Error fetching messages:', error);
        throw new Error(`Failed to fetch messages: ${error.description}`);
      }
      
      return await messagesResponse.json();
    }
    
    return await chatHistoryResponse.json();
  }
  
  return await response.json();
}

export async function getAllChannelMessages(botToken: string, channelId: number) {
  console.log(`Starting to fetch all messages for channel ${channelId}`);
  
  const messages = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    try {
      console.log(`Fetching messages from offset ${offset}`);
      const data = await getChannelHistory(botToken, channelId, offset, limit);
      
      if (!data.ok || !data.result || data.result.length === 0) {
        console.log('No more messages to fetch');
        hasMore = false;
        break;
      }

      messages.push(...data.result);
      console.log(`Fetched ${data.result.length} messages`);
      
      if (data.result.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }

      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching messages at offset ${offset}:`, error);
      throw error;
    }
  }

  console.log(`Total messages fetched: ${messages.length}`);
  return messages;
}