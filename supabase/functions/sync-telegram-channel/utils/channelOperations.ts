import { logOperation } from "../../_shared/database.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

export async function getChannelMessages(botToken: string, channelId: number, offset = 0) {
  console.log(`Fetching messages from offset ${offset} for channel ${channelId}`);
  
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getHistory`,
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to fetch messages: ${errorText}`);
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.ok) {
    console.error('Telegram API error:', data);
    throw new Error(data.description || 'Failed to fetch messages');
  }

  return data.result;
}

export async function getAllChannelMessages(botToken: string, channelId: number) {
  const messages = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    try {
      console.log(`Fetching messages at offset ${offset}`);
      const batch = await getChannelMessages(botToken, channelId, offset);
      
      if (!batch || batch.length === 0) {
        hasMore = false;
        break;
      }
      
      messages.push(...batch);
      offset += batch.length;
      
      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching messages at offset ${offset}:`, error);
      throw error;
    }
  }
  
  return messages;
}