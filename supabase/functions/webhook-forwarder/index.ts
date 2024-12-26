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
    const { webhook_url, data, headers = {}, params = {} } = await req.json();
    console.log('Received webhook request:', { webhook_url, data, headers, params });

    if (!webhook_url) {
      throw new Error('Webhook URL is required');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }

    // Validate webhook URL format
    try {
      new URL(webhook_url);
    } catch {
      throw new Error('Invalid webhook URL format');
    }

    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        params
      })
    });

    const responseData = await response.json().catch(() => null);
    console.log('Webhook response:', { status: response.status, data: responseData });

    if (!response.ok) {
      throw new Error(`Webhook request failed with status ${response.status}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: response.status,
        data: responseData
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