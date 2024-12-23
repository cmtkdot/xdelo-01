import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, settings, trainingContext } = await req.json();
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing natural language query:', message);

    // First, determine if this is a SQL query or webhook action
    const intentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that categorizes user queries into either "sql" or "webhook" actions. 
            Here is some context about the system and examples:
            ${trainingContext}
            Respond with ONLY "sql" or "webhook" based on whether the user is trying to query data or trigger a webhook action.`
          },
          { role: 'user', content: message }
        ],
        temperature: settings?.temperature ?? 0.7,
        max_tokens: settings?.maxTokens ?? 500,
      }),
    });

    const intentData = await intentResponse.json();
    const intent = intentData.choices[0].message.content.toLowerCase().trim();
    
    console.log('Detected intent:', intent);

    if (intent === 'sql') {
      // Generate SQL query
      const sqlResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a SQL expert. Convert natural language queries into PostgreSQL queries.
              Available tables: media, messages, channels, webhook_urls, webhook_history, ai_training_data.
              Here are some SQL examples and documentation:
              ${trainingContext}
              Only generate the SQL query, no explanations.`
            },
            { role: 'user', content: message }
          ],
          temperature: settings?.temperature ?? 0.7,
          max_tokens: settings?.maxTokens ?? 500,
        }),
      });

      const sqlData = await sqlResponse.json();
      const sqlQuery = sqlData.choices[0].message.content;
      
      console.log('Generated SQL query:', sqlQuery);

      // Execute the query using the safe execution function
      const { data: queryResult, error: queryError } = await supabase.rpc('execute_safe_query', {
        query_text: sqlQuery
      });

      if (queryError) {
        console.error('Error executing query:', queryError);
        throw queryError;
      }

      console.log('Query result:', queryResult);

      return new Response(
        JSON.stringify({
          type: 'sql',
          query: sqlQuery,
          result: queryResult
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (intent === 'webhook') {
      // Get webhook URLs for context
      const { data: webhookUrls, error: webhookError } = await supabase
        .from('webhook_urls')
        .select('*');

      if (webhookError) {
        throw new Error(`Error fetching webhook URLs: ${webhookError.message}`);
      }

      if (!webhookUrls || webhookUrls.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'No webhook URLs configured. Please add a webhook URL first.'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Generate webhook action
      const webhookResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a webhook expert. Convert natural language into webhook actions.
              Available webhooks: ${JSON.stringify(webhookUrls)}.
              Here is some context about webhooks and examples:
              ${trainingContext}
              Return a JSON object with: { webhookId, data }.`
            },
            { role: 'user', content: message }
          ],
          temperature: settings?.temperature ?? 0.7,
          max_tokens: settings?.maxTokens ?? 500,
        }),
      });

      const webhookData = await webhookResponse.json();
      const webhookAction = JSON.parse(webhookData.choices[0].message.content);

      // Get the webhook URL
      const webhook = webhookUrls?.find(w => w.id === webhookAction.webhookId);
      
      if (!webhook) {
        return new Response(
          JSON.stringify({
            error: 'Selected webhook not found. Please verify webhook configuration.'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      try {
        // Execute webhook
        const webhookResult = await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookAction.data),
        });

        if (!webhookResult.ok) {
          throw new Error(`Webhook request failed with status: ${webhookResult.status}`);
        }

        return new Response(
          JSON.stringify({
            type: 'webhook',
            action: webhookAction,
            result: 'Webhook executed successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (webhookError) {
        console.error('Webhook execution error:', webhookError);
        return new Response(
          JSON.stringify({
            error: `Failed to execute webhook: ${webhookError.message}`
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    throw new Error('Invalid intent detected');

  } catch (error) {
    console.error('Error processing natural language:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred while processing your request'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});