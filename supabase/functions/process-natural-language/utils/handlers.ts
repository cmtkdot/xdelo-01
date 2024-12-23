import { detectIntent, generateSqlQuery, generateWebhookAction } from './openai.ts';
import { initSupabase } from './supabase.ts';

export const handleSqlQuery = async (message: string, settings: any, trainingContext: string, openaiApiKey: string) => {
  const supabase = initSupabase();
  
  const sqlQuery = await generateSqlQuery(message, settings, trainingContext, openaiApiKey);
  console.log('Generated SQL query:', sqlQuery);

  const { data: queryResult, error: queryError } = await supabase.rpc('execute_safe_query', {
    query_text: sqlQuery
  });

  if (queryError) {
    console.error('Error executing query:', queryError);
    throw queryError;
  }

  console.log('Query result:', queryResult);

  return {
    type: 'sql',
    query: sqlQuery,
    result: queryResult
  };
};

export const handleWebhookAction = async (message: string, settings: any, trainingContext: string, openaiApiKey: string) => {
  const supabase = initSupabase();
  
  const { data: webhookUrls, error: webhookError } = await supabase
    .from('webhook_urls')
    .select('*');

  if (webhookError) {
    throw new Error(`Error fetching webhook URLs: ${webhookError.message}`);
  }

  if (!webhookUrls || webhookUrls.length === 0) {
    throw new Error('No webhook URLs configured. Please add a webhook URL first.');
  }

  const webhookAction = await generateWebhookAction(message, settings, trainingContext, webhookUrls, openaiApiKey);
  const webhook = webhookUrls?.find((w: any) => w.id === webhookAction.webhookId);
  
  if (!webhook) {
    throw new Error('Selected webhook not found. Please verify webhook configuration.');
  }

  try {
    const webhookResult = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookAction.data),
    });

    if (!webhookResult.ok) {
      throw new Error(`Webhook request failed with status: ${webhookResult.status}`);
    }

    // Log webhook history
    const { error: historyError } = await supabase
      .from('webhook_history')
      .insert({
        webhook_url_id: webhook.id,
        fields_sent: Object.keys(webhookAction.data),
        schedule_type: 'manual',
        status: 'success',
        media_count: Array.isArray(webhookAction.data) ? webhookAction.data.length : 1
      });

    if (historyError) {
      console.error('Error logging webhook history:', historyError);
    }

    return {
      type: 'webhook',
      action: webhookAction,
      result: 'Webhook executed successfully'
    };
  } catch (error) {
    // Log failed webhook attempt
    await supabase
      .from('webhook_history')
      .insert({
        webhook_url_id: webhook.id,
        fields_sent: Object.keys(webhookAction.data),
        schedule_type: 'manual',
        status: 'failed',
        media_count: Array.isArray(webhookAction.data) ? webhookAction.data.length : 1
      });

    throw error;
  }
};