import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "assistant" | "user";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicApiKey) {
      throw new Error("Missing Anthropic API key");
    }

    if (!Array.isArray(messages)) {
      throw new Error("Messages must be an array");
    }

    console.log('Received messages:', messages);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recent media data for context
    const { data: mediaData, error: mediaError } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (mediaError) {
      console.error('Error fetching media data:', mediaError);
      throw mediaError;
    }

    // Fetch recent channel data
    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (channelError) {
      console.error('Error fetching channel data:', channelError);
      throw channelError;
    }

    // Create system message with context
    const systemMessage = {
      role: "assistant",
      content: `You are Claude, an AI assistant integrated with a Telegram media management system. 
      You have access to the following recent data:
      - Recent Media Files: ${JSON.stringify(mediaData)}
      - Active Channels: ${JSON.stringify(channelData)}
      
      You can help users understand their media data, suggest optimizations, and provide insights about their Telegram channels.
      Always be helpful, clear, and concise in your responses.`
    };

    // Prepare messages array with system message
    const allMessages = [systemMessage, ...messages];

    console.log('Sending request to Anthropic with messages:', allMessages);

    // Make request to Anthropic's API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 1000,
        messages: allMessages,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error response:', errorText);
      throw new Error(`Anthropic API error: ${errorText}`);
    }

    const result = await response.json();
    console.log('Claude response:', result);

    if (!result.content || !result.content[0]) {
      throw new Error('Invalid response format from Claude API');
    }

    return new Response(JSON.stringify({ content: result.content[0].text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Error in chat-with-claude function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while processing your request",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});