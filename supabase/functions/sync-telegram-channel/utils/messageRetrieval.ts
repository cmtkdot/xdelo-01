import { getChannelHistory } from "./telegramApi.ts";
import { processMessage } from "./messageProcessor.ts";

export async function getAllChannelMessages(botToken: string, channelId: number) {
  console.log(`[getAllChannelMessages] Starting message fetch for channel ${channelId}`);
  
  const messages = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    try {
      console.log(`[getAllChannelMessages] Fetching batch at offset ${offset}`);
      const batch = await getChannelHistory(botToken, channelId, offset);
      
      if (!batch || batch.length === 0) {
        console.log(`[getAllChannelMessages] No more messages found at offset ${offset}`);
        break;
      }
      
      console.log(`[getAllChannelMessages] Received batch of ${batch.length} messages`);
      messages.push(...batch);
      offset += batch.length;
      
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[getAllChannelMessages] Error fetching messages at offset ${offset}:`, error);
      // Don't throw here, just break the loop
      break;
    }
  }
  
  console.log(`[getAllChannelMessages] Completed fetch for channel ${channelId}. Total messages: ${messages.length}`);
  return messages;
}

export { processMessage };