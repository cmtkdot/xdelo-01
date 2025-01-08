export const fetchTelegramMessages = async (botToken: string, chatId: string, messageIds: number[]) => {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getMessages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_ids: messageIds,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.ok || !data.result) {
    throw new Error('Invalid response from Telegram API');
  }

  return data.result;
};

export const createCaptionMap = (messages: any[]) => {
  return messages.reduce((acc: Record<number, string>, msg: any) => {
    if (msg.caption) acc[msg.message_id] = msg.caption;
    return acc;
  }, {});
};