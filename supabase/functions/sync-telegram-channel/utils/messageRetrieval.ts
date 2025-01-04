export async function getChannelMessages(botToken: string, channelId: number, offset = 0) {
  console.log(`[getChannelMessages] Starting fetch for channel ${channelId} with offset ${offset}`);
  
  try {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
    console.log(`[getChannelMessages] Calling Telegram API: ${url}`);
    
    const requestBody = {
      offset: offset,
      limit: 100,
      allowed_updates: ["message", "channel_post"]
    };
    
    console.log(`[getChannelMessages] Request payload:`, requestBody);

    const response = await fetch(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getChannelMessages] API Error Response:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Failed to fetch messages: ${response.statusText} (${errorText})`);
    }

    const data = await response.json();
    console.log(`[getChannelMessages] Successful response for channel ${channelId}:`, {
      updateCount: data.result?.length || 0,
      hasMore: data.result?.length === 100
    });
    
    if (!data.ok) {
      console.error('[getChannelMessages] Telegram API returned error:', data);
      throw new Error(data.description || 'Failed to fetch messages');
    }

    // Filter updates for this specific channel
    const channelUpdates = data.result.filter(update => 
      (update.message?.chat.id === channelId) || 
      (update.channel_post?.chat.id === channelId)
    );

    // Map to message format
    return channelUpdates.map(update => update.message || update.channel_post);
  } catch (error) {
    console.error(`[getChannelMessages] Error details:`, {
      channelId,
      offset,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export async function getChannelHistory(botToken: string, channelId: number, offset = 0) {
  console.log(`[getChannelHistory] Starting fetch for channel ${channelId} with offset ${offset}`);
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/forwardMessages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: channelId,
          from_chat_id: channelId,
          message_ids: Array.from({ length: 100 }, (_, i) => offset + i + 1)
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getChannelHistory] Failed to fetch history:`, errorText);
      throw new Error(`Failed to fetch history: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      console.error('[getChannelHistory] Telegram API error:', data);
      throw new Error(data.description || 'Failed to fetch history');
    }

    return data.result;
  } catch (error) {
    console.error(`[getChannelHistory] Error fetching history:`, error);
    throw error;
  }
}