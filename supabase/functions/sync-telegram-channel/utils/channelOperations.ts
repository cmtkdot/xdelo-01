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
  console.log(`Fetching messages from offset ${offset} for channel ${channelId}`);
  
  // Use messages.getHistory as it's the most reliable method
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/messages.getHistory`,
    {
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
    const error = await response.json();
    console.error('Error fetching messages:', error);
    throw new Error(`Failed to fetch messages: ${error.description}`);
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
        offset = messages[messages.length - 1].message_id;
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