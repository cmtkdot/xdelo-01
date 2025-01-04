import { corsHeaders } from "../../_shared/cors.ts";

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
  
  // Use getHistory method which works with webhooks
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getHistory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: channelId,
        offset_id: offset,
        limit: 100
      })
    }
  );

  if (!response.ok) {
    console.log('getHistory failed, trying getChatHistory...');
    
    // Try getChatHistory as fallback
    const historyResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatHistory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: channelId,
          offset_id: offset,
          limit: 100
        })
      }
    );

    if (!historyResponse.ok) {
      console.log('getChatHistory failed, trying messages.getHistory...');
      
      // Final fallback to messages.getHistory
      const messagesResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/messages.getHistory`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            peer: {
              _: 'inputPeerChannel',
              channel_id: Math.abs(channelId),
              access_hash: '0' // We'll get this from channel info if needed
            },
            offset_id: offset,
            limit: 100
          })
        }
      );
      
      if (!messagesResponse.ok) {
        const error = await messagesResponse.json();
        console.error('Error fetching messages:', error);
        throw new Error(`Failed to fetch messages: ${error.description}`);
      }
      
      return await messagesResponse.json();
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

      // Add a delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error fetching messages at offset ${offset}:`, error);
      throw error;
    }
  }

  console.log(`Total messages fetched: ${messages.length}`);
  return messages;
}