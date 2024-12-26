import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { webhook_url, data, headers = {}, params = {}, method = 'POST' } = await req.json();
    console.log('Received webhook request:', { webhook_url, data, headers, params, method });

    if (!webhook_url) {
      throw new Error('Webhook URL is required');
    }

    // Validate webhook URL format
    try {
      new URL(webhook_url);
    } catch {
      throw new Error('Invalid webhook URL format');
    }

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
    if (method !== 'GET' && method !== 'DELETE' && data) {
      requestOptions.body = JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        params
      });
    }

    const response = await fetch(url.toString(), requestOptions);
    const responseData = await response.json().catch(() => null);
    console.log('Webhook response:', { status: response.status, data: responseData });

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
      throw new Error(`Webhook request failed with status ${response.status}`);
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
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('required') || error.message.includes('Invalid') ? 400 : 500
      }
    );
  }
});