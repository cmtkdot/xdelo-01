import { getChannelMessages, getChannelHistory } from "./messageRetrieval.ts";
import { verifyChannelAccess } from "./telegramApi.ts";
import { logOperation } from "../../_shared/database.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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

export { verifyChannelAccess };