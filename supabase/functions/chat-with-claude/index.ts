import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, settings, trainingContext } = await req.json();
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get relevant data from database to provide context
    const { data: mediaData } = await supabaseAdmin
      .from('media')
      .select('*')
      .limit(5);

    const { data: channelsData } = await supabaseAdmin
      .from('channels')
      .select('*')
      .limit(5);

    // Prepare system message with enhanced natural language understanding
    const systemMessage = `You are a friendly and helpful AI assistant for a Telegram media management system. You understand natural language queries and provide clear, conversational responses.

    Context about the system:
    - Recent media files: ${JSON.stringify(mediaData)}
    - Active channels: ${JSON.stringify(channelsData)}
    ${trainingContext}
    
    IMPORTANT GUIDELINES:
    1. Be conversational and friendly in your responses.
    2. When users ask questions, interpret their intent and provide clear explanations.
    3. For data queries:
       - Execute SQL queries using execute_safe_query
       - Explain the results in a natural, easy-to-understand way
       - Only show the SQL query if specifically asked
       - Focus on insights and meaningful observations
    4. Start responses with a friendly acknowledgment of the user's question
    5. Use natural transitions between thoughts
    6. End responses with a relevant follow-up question or suggestion when appropriate
    
    Example interactions:
    User: "How many videos do we have?"
    Assistant: "I checked our media collection and found 45 videos. Most of them were uploaded in the last month, and the Tech News channel has been particularly active with video content. Would you like to see a breakdown by channel?"
    
    User: "What happened yesterday?"
    Assistant: "Looking at yesterday's activity, it was quite busy! We received 12 new media files - 8 images and 4 videos. The Tech News channel was the most active, sharing 15 messages. The gaming updates channel also had some interesting content. Would you like me to focus on any particular channel or type of media?"`;

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: settings?.model ?? 'claude-3-sonnet',
        messages: [
          { role: 'user', content: systemMessage },
          ...messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
        ],
        max_tokens: settings?.maxTokens ?? 500,
        temperature: settings?.temperature ?? 0.7,
      }),
    });

    const data = await response.json();
    let aiResponse = data.content[0].text;

    // Check if the response contains a SQL query
    const sqlMatch = aiResponse.match(/```sql\n([\s\S]*?)\n```/);
    if (sqlMatch) {
      const sqlQuery = sqlMatch[1];
      console.log('Executing SQL query:', sqlQuery);
      
      // Execute the query using the safe query function
      const { data: queryResult, error: queryError } = await supabaseAdmin.rpc('execute_safe_query', {
        query_text: sqlQuery
      });

      if (queryError) {
        console.error('Error executing query:', queryError);
        throw queryError;
      }

      // Format the response in a more conversational way
      aiResponse = aiResponse.replace(/```sql\n[\s\S]*?\n```/, 
        `Based on the data I found:\n\n${JSON.stringify(queryResult, null, 2)}\n\n`
      );
    }

    return new Response(
      JSON.stringify({ content: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in chat-with-claude function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});