export const fetchTelegramMessages = async (botToken: string, chatId: string | number, messageIds: number[]) => {
  console.log(`Fetching messages for chat ${chatId}, messages:`, messageIds);
  
  const messages = [];
  for (const messageId of messageIds) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getMessage?chat_id=${chatId}&message_id=${messageId}`
      );

      if (!response.ok) {
        console.error(`Failed to fetch message ${messageId}:`, response.statusText);
        continue;
      }

      const data = await response.json();
      if (data.ok && data.result) {
        messages.push(data.result);
      }
    } catch (error) {
      console.error(`Error fetching message ${messageId}:`, error);
    }
  }

  return messages;
};

export const createCaptionMap = (messages: any[]) => {
  const captionMap: Record<number, string> = {};
  const mediaGroups: Record<string, { caption: string, messageIds: number[] }> = {};

  // First pass: collect all media group information
  messages.forEach(message => {
    const messageId = message.message_id;
    const mediaGroupId = message.media_group_id;
    const caption = message.caption || '';

    if (mediaGroupId) {
      if (!mediaGroups[mediaGroupId]) {
        mediaGroups[mediaGroupId] = { caption: '', messageIds: [] };
      }
      if (caption) {
        mediaGroups[mediaGroupId].caption = caption;
      }
      mediaGroups[mediaGroupId].messageIds.push(messageId);
    } else {
      captionMap[messageId] = caption;
    }
  });

  // Second pass: apply media group captions
  Object.values(mediaGroups).forEach(group => {
    const { caption, messageIds } = group;
    messageIds.forEach(messageId => {
      captionMap[messageId] = caption;
    });
  });

  return captionMap;
};