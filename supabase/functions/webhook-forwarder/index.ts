import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhook_url, data, headers = {}, params = {}, method = 'POST', body, schedule_type = 'manual' } = await req.json();
    console.log('Received webhook request:', { webhook_url, method, headers, params, schedule_type });

    if (!webhook_url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Webhook URL is required'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Validate webhook URL format
    try {
      new URL(webhook_url);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid webhook URL format'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Add query parameters to URL if they exist
    const url = new URL(webhook_url);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    // Only add body for methods that typically have one
    if (method !== 'GET' && method !== 'DELETE') {
      const requestBody = {
        ...(data || {}),
        ...(body || {}),
        timestamp: new Date().toISOString()
      };

      requestOptions.body = JSON.stringify(requestBody);
      console.log('Request body:', requestOptions.body);
    }

    console.log('Making request to:', url.toString());
    console.log('Request options:', requestOptions);

    const response = await fetch(url.toString(), requestOptions);
    const responseData = await response.json().catch(() => null);
    
    console.log('Webhook response:', { 
      status: response.status, 
      statusText: response.statusText,
      data: responseData 
    });

    // Log webhook execution in webhook_history
    if (webhook_url) {
      const { data: webhookUrlData } = await supabase
        .from('webhook_urls')
        .select('id')
        .eq('url', webhook_url)
        .single();

      if (webhookUrlData?.id) {
        await supabase
          .from('webhook_history')
          .insert({
            webhook_url_id: webhookUrlData.id,
            fields_sent: data?.selected_fields || [],
            schedule_type,
            status: response.ok ? 'success' : 'error',
            media_count: data?.length || 0
          });
      }
    }

    // Extract headers from response data if it's an array of objects
    let extractedHeaders = [];
    if (Array.isArray(responseData)) {
      const firstItem = responseData[0];
      if (firstItem && typeof firstItem === 'object') {
        extractedHeaders = Object.keys(firstItem);
      }
    } else if (responseData && typeof responseData === 'object') {
      extractedHeaders = Object.keys(responseData);
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Webhook request failed with status ${response.status}`,
          details: responseData,
          requestBody: method !== 'GET' ? JSON.parse(requestOptions.body as string) : undefined
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: response.status,
        data: responseData,
        headers: extractedHeaders
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('required') || error.message.includes('Invalid') ? 400 : 500
      }
    );
  }
});