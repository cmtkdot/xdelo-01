import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhook_url, data, headers = {}, params = {} } = await req.json();
    console.log('Forwarding webhook to:', webhook_url);
    console.log('With data:', data);
    console.log('With headers:', headers);
    console.log('With query params:', params);
    
    // Construct URL with query parameters
    const url = new URL(webhook_url);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value as string);
    });
    
    // Forward to webhook with proper headers
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase Edge Function',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with status ${response.status}: ${response.statusText}`);
    }

    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      // For non-JSON responses, create a structured response
      responseData = {
        status: response.status,
        statusText: response.statusText,
        text: await response.text()
      };
    }

    console.log('Webhook response:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Webhook forwarded successfully',
        response: responseData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in webhook forwarder:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});