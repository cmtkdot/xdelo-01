import { corsHeaders } from "../../_shared/cors.ts";

export async function getBotInfo(botToken: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getMe`
  );

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error('Failed to get bot info');
  }

  return data.result;
}

export async function verifyChannelAccess(botToken: string, channelId: number) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat_id: channelId }),
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
          chat_id: channelId,
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