import { logOperation } from "../../_shared/database.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

export async function getChannelMessages(botToken: string, channelId: number, offset = 0) {
  console.log(`[getChannelMessages] Starting fetch for channel ${channelId} with offset ${offset}`);
  
  try {
    // Using getHistory method instead of getChatHistory
    const url = `https://api.telegram.org/bot${botToken}/getHistory`;
    console.log(`[getChannelMessages] Calling Telegram API: ${url}`);
    
    const requestBody = {
      chat_id: channelId,
      offset: offset,
      limit: 100
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

      // Try alternative method if first one fails
      if (response.status === 404) {
        console.log('[getChannelMessages] Trying alternative method getMessages...');
        const altResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/getMessages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!altResponse.ok) {
          const altErrorText = await altResponse.text();
          console.error('[getChannelMessages] Alternative method also failed:', altErrorText);
          throw new Error(`Failed to fetch messages: ${altResponse.statusText} (${altErrorText})`);
        }

        const altData = await altResponse.json();
        if (!altData.ok) {
          throw new Error(altData.description || 'Failed to fetch messages');
        }
        return altData.result;
      }

      // Log detailed error to database
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
      messageCount: data.result?.length || 0,
      hasMore: data.result?.length === 100
    });
    
    if (!data.ok) {
      console.error('[getChannelMessages] Telegram API returned error:', data);
      throw new Error(data.description || 'Failed to fetch messages');
    }

    // Log successful fetch
    await logOperation(
      supabase,
      'sync-telegram-channel',
      'info',
      `Successfully fetched ${data.result?.length || 0} messages from channel ${channelId} at offset ${offset}`
    );

    return data.result;
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

export async function getAllChannelMessages(botToken: string, channelId: number) {
  console.log(`[getAllChannelMessages] Starting message fetch for channel ${channelId}`);
  
  const messages = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    try {
      console.log(`[getAllChannelMessages] Fetching batch at offset ${offset}`);
      const batch = await getChannelMessages(botToken, channelId, offset);
      
      if (!batch || batch.length === 0) {
        console.log(`[getAllChannelMessages] No more messages found at offset ${offset}`);
        hasMore = false;
        break;
      }
      
      console.log(`[getAllChannelMessages] Received batch of ${batch.length} messages`);
      messages.push(...batch);
      offset += batch.length;
      
      // Add a small delay to avoid hitting rate limits
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
      
      throw error;
    }
  }
  
  console.log(`[getAllChannelMessages] Completed fetch for channel ${channelId}. Total messages: ${messages.length}`);
  return messages;
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

    return data.result;
  } catch (error) {
    console.error('Error verifying channel access:', error);
    throw error;
  }
}