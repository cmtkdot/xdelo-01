import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const forwardUpdate = async (
  supabase: ReturnType<typeof createClient>,
  update: any,
  message: any,
  mediaResult: any
) => {
  try {
    // Get active webhook configurations
    const { data: webhookConfigs, error: configError } = await supabase
      .from('webhook_configurations')
      .select(`
        *,
        webhook_url:webhook_urls(url)
      `)
      .eq('is_active', true);

    if (configError) throw configError;
    if (!webhookConfigs || webhookConfigs.length === 0) {
      console.log('[forwardUpdate] No active webhook configurations found');
      return null;
    }

    const results = [];
    
    for (const config of webhookConfigs) {
      try {
        console.log(`[forwardUpdate] Forwarding to webhook: ${config.webhook_url.url}`);
        
        // Prepare headers
        const headers = {
          'Content-Type': 'application/json',
          ...Object.fromEntries(
            config.headers?.map((h: any) => [h.key, h.value]) || []
          )
        };

        // Prepare query parameters
        const queryParams = new URLSearchParams(
          Object.fromEntries(
            config.query_params?.map((p: any) => [p.key, p.value]) || []
          )
        );

        // Prepare URL with query parameters
        const url = `${config.webhook_url.url}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

        // Prepare body
        const body = {
          update,
          message,
          media: mediaResult,
          timestamp: new Date().toISOString(),
          ...Object.fromEntries(
            config.body_params?.map((p: any) => [p.key, p.value]) || []
          )
        };

        // Send webhook
        const response = await fetch(url, {
          method: config.method || 'POST',
          headers,
          body: JSON.stringify(body)
        });

        const result = {
          webhook_id: config.id,
          status: response.ok ? 'success' : 'error',
          status_code: response.status,
          response: await response.text()
        };

        // Log webhook result
        await supabase
          .from('webhook_history')
          .insert({
            webhook_url_id: config.webhook_url_id,
            fields_sent: Object.keys(body),
            schedule_type: 'realtime',
            status: result.status,
            media_count: mediaResult ? 1 : 0
          });

        results.push(result);
        
        console.log(`[forwardUpdate] Successfully forwarded to webhook: ${config.webhook_url.url}`);
      } catch (error) {
        console.error(`[forwardUpdate] Error forwarding to webhook ${config.webhook_url.url}:`, error);
        results.push({
          webhook_id: config.id,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('[forwardUpdate] Error:', error);
    throw error;
  }
};