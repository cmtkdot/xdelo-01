export async function getTelegramFilePath(fileId: string, botToken: string): Promise<string> {
  console.log(`[getTelegramFilePath] Getting file path for file ID: ${fileId}`);
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[getTelegramFilePath] Telegram API error:', errorData);
      throw new Error(`Failed to get file info: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.ok || !data.result.file_path) {
      console.error('[getTelegramFilePath] Invalid response from Telegram:', data);
      throw new Error('Failed to get file path from Telegram');
    }

    console.log(`[getTelegramFilePath] Successfully got file path: ${data.result.file_path}`);
    return data.result.file_path;
  } catch (error) {
    console.error('[getTelegramFilePath] Error:', error);
    throw error;
  }
}

export async function downloadTelegramFile(filePath: string, botToken: string): Promise<ArrayBuffer> {
  console.log(`[downloadTelegramFile] Downloading file from path: ${filePath}`);
  
  try {
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      console.error('[downloadTelegramFile] Download failed:', response.statusText);
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    console.log(`[downloadTelegramFile] Successfully downloaded file of size: ${buffer.byteLength} bytes`);
    return buffer;
  } catch (error) {
    console.error('[downloadTelegramFile] Error:', error);
    throw error;
  }
}

export async function getAndDownloadTelegramFile(fileId: string, botToken: string): Promise<{
  buffer: ArrayBuffer;
  filePath: string;
}> {
  console.log(`[getAndDownloadTelegramFile] Processing file ID: ${fileId}`);
  
  try {
    const filePath = await getTelegramFilePath(fileId, botToken);
    console.log(`[getAndDownloadTelegramFile] Got file path: ${filePath}`);
    
    const buffer = await downloadTelegramFile(filePath, botToken);
    console.log(`[getAndDownloadTelegramFile] Successfully downloaded file`);
    
    return { buffer, filePath };
  } catch (error) {
    console.error('[getAndDownloadTelegramFile] Error:', error);
    throw error;
  }
}

export async function validateWebhookSecret(secret: string | null): Promise<boolean> {
  if (!secret) {
    console.error('[validateWebhookSecret] No secret provided');
    return false;
  }

  const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  if (!WEBHOOK_SECRET) {
    console.error('[validateWebhookSecret] Webhook secret not configured');
    return false;
  }
  
  const isValid = secret === WEBHOOK_SECRET;
  console.log(`[validateWebhookSecret] Secret validation ${isValid ? 'successful' : 'failed'}`);
  
  return isValid;
}