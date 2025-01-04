import { logOperation } from "../../_shared/database.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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

      // Log error to database
      await logOperation(
        supabase,
        'sync-telegram-channel',
        'error',
        `Failed to fetch messages for channel ${channelId}. Status: ${response.status}. Error: ${errorText}`
      );

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
    const messages = channelUpdates.map(update => update.message || update.channel_post);

    // Log successful fetch
    await logOperation(
      supabase,
      'sync-telegram-channel',
      'info',
      `Successfully fetched ${messages.length} messages from channel ${channelId} at offset ${offset}`
    );

    return messages;
  } catch (error) {
    console.error(`[getChannelMessages] Error details:`, {
      channelId,
      offset,
      error: error.message,
      stack: error.stack
    });

    // Log error to database
    await logOperation(
      supabase,
      'sync-telegram-channel',
      'error',
      `Error in getChannelMessages: ${error.message}`
    );

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

export async function getAllChannelMessages(botToken: string, channelId: number) {
  console.log(`[getAllChannelMessages] Starting message fetch for channel ${channelId}`);
  
  const messages = [];
  let offset = 0;
  let hasMore = true;
  
  // First try to get recent updates
  try {
    console.log(`[getAllChannelMessages] Fetching recent updates`);
    const updates = await getChannelMessages(botToken, channelId);
    messages.push(...updates);
  } catch (error) {
    console.error('[getAllChannelMessages] Error getting recent updates:', error);
    
    // Log error to database
    await logOperation(
      supabase,
      'sync-telegram-channel',
      'error',
      `Error fetching recent updates: ${error.message}\nStack: ${error.stack}`
    );
  }
  
  // Then try to get history
  while (hasMore) {
    try {
      console.log(`[getAllChannelMessages] Fetching batch at offset ${offset}`);
      const batch = await getChannelHistory(botToken, channelId, offset);
      
      if (!batch || batch.length === 0) {
        console.log(`[getAllChannelMessages] No more messages found at offset ${offset}`);
        hasMore = false;
        break;
      }
      
      console.log(`[getAllChannelMessages] Received batch of ${batch.length} messages`);
      messages.push(...batch);
      offset += batch.length;
      
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[getAllChannelMessages] Error fetching messages at offset ${offset}:`, error);
      
      // Log error to database with detailed information
      await logOperation(
        supabase,
        'sync-telegram-channel',
        'error',
        `Error fetching messages at offset ${offset}: ${error.message}\nStack: ${error.stack}`
      );
      
      hasMore = false;
    }
  }
  
  console.log(`[getAllChannelMessages] Completed fetch for channel ${channelId}. Total messages: ${messages.length}`);
  return messages;
}

async function getBotInfo(botToken: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getMe`
  );

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error('Failed to get bot info');
  }

  return data.result;
}

export async function verifyChannelAccess(botToken: string, chatId: number) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat_id: chatId }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Channel access verification failed:', errorText);
      throw new Error(`Failed to verify channel access: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.description || 'Failed to verify channel access');
    }

    // Verify bot permissions
    const botInfo = await getBotInfo(botToken);
    const botPermissions = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: botInfo.id
        }),
      }
    ).then(res => res.json());

    if (!botPermissions.ok || !['administrator', 'creator'].includes(botPermissions.result.status)) {
      throw new Error('Bot needs to be an administrator of the channel');
    }

    return data.result;
  } catch (error) {
    console.error('Error verifying channel access:', error);
    throw error;
  }
}