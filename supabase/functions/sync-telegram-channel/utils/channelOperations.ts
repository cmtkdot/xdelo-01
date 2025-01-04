import { logOperation } from "../../_shared/database.ts";

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

export async function getChannelMessages(botToken: string, channelId: number, offset = 0) {
  console.log(`Fetching messages from offset ${offset}`);
  
  // First try getHistory
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getHistory?chat_id=${channelId}&offset=${offset}&limit=100`
  );

  if (!response.ok) {
    console.log('getHistory failed, trying getChatHistory...');
    
    // Try getChatHistory as fallback
    const historyResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatHistory?chat_id=${channelId}&offset=${offset}&limit=100`
    );

    if (!historyResponse.ok) {
      console.log('getChatHistory failed, trying getUpdates...');
      
      // Final fallback to getUpdates
      const updatesResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getUpdates?chat_id=${channelId}&offset=${offset}&limit=100`
      );
      
      if (!updatesResponse.ok) {
        const error = await updatesResponse.json();
        console.error('Error fetching messages:', error);
        throw new Error(`Failed to fetch messages: ${error.description}`);
      }
      
      return await updatesResponse.json();
    }
    
    return await historyResponse.json();
  }
  
  return await response.json();
}

export async function getAllChannelMessages(botToken: string, channelId: number) {
  console.log(`Starting to fetch all messages for channel ${channelId}`);
  
  const messages = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const data = await getChannelMessages(botToken, channelId, offset);
      
      if (!data.ok || !data.result || data.result.length === 0) {
        console.log('No more messages to fetch');
        hasMore = false;
        break;
      }

      messages.push(...data.result);
      console.log(`Fetched ${data.result.length} messages`);
      
      if (data.result.length < 100) {
        hasMore = false;
      } else {
        offset += 100;
      }

      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error fetching messages at offset ${offset}:`, error);
      throw error;
    }
  }

  console.log(`Total messages fetched: ${messages.length}`);
  return messages;
}

export async function getMessageHistory(botToken: string, channelId: number) {
  const url = `https://api.telegram.org/bot${botToken}/messages.getHistory`;
  const params = {
    peer: {
      _: 'inputPeerChannel',
      channel_id: channelId,
      access_hash: '' // We'll need to get this from the channel info
    },
    offset_id: 0,
    offset_date: 0,
    add_offset: 0,
    limit: 100,
    max_id: 0,
    min_id: 0,
    hash: 0
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error fetching message history:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getMessageHistory:', error);
    return null;
  }
}