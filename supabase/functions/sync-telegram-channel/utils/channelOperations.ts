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

export async function getChannelMessages(botToken: string, channelId: number, offset = 0, limit = 100) {
  // Using getChatHistory for channels
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getChatHistory?chat_id=${channelId}&offset=${offset}&limit=${limit}`
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('Error fetching messages:', error);
    
    // If getChatHistory is not available, try getMessages
    if (error.error_code === 404) {
      const messagesResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getMessages?chat_id=${channelId}&message_ids=${
          Array.from({length: limit}, (_, i) => offset + i + 1).join(',')
        }`
      );
      
      if (!messagesResponse.ok) {
        throw new Error(`Failed to fetch messages: ${error.description}`);
      }
      
      return await messagesResponse.json();
    }
    
    throw new Error(`Failed to fetch messages: ${error.description}`);
  }
  
  return await response.json();
}