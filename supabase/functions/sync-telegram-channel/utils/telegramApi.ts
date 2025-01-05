import { corsHeaders } from "../../_shared/cors.ts";

export async function getChannelHistory(botToken: string, channelId: number, offset = 0) {
  console.log(`[getChannelHistory] Starting fetch for channel ${channelId} with offset ${offset}`);
  
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getUpdates`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: channelId,
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
    
    return await getChannelMessagesAlternative(botToken, channelId, offset);
  }

  const data = await response.json();
  return data.result || [];
}

async function getChannelMessagesAlternative(botToken: string, channelId: number, offset = 0) {
  console.log(`[getChannelMessagesAlternative] Trying alternative method for channel ${channelId}`);
  
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getChat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: channelId
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get channel info: ${errorText}`);
  }

  // If we can get chat info, try getting messages
  const messagesResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/getChatHistory`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: channelId,
        offset: offset,
        limit: 100
      }),
    }
  );

  if (!messagesResponse.ok) {
    const errorText = await messagesResponse.text();
    console.error('Alternative method failed:', errorText);
    return [];
  }

  const data = await messagesResponse.json();
  return data.result || [];
}