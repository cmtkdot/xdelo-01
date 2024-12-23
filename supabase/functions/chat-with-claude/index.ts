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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
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

    // Prepare system message with database context
    const systemMessage = `You are an AI assistant with access to a Telegram media management system. 
    Here's some context about the current data:
    - Recent media files: ${JSON.stringify(mediaData)}
    - Active channels: ${JSON.stringify(channelsData)}
    ${trainingContext}
    
    Provide helpful responses about the data and system capabilities.`;

    let aiResponse;
    const model = settings?.model ?? 'gpt-4o-mini';

    if (model.startsWith('gemini')) {
      if (!geminiApiKey) {
        throw new Error('Gemini API key not configured');
      }
      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${geminiApiKey}`,
        },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemMessage }] },
            ...messages.map((msg: any) => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }],
            })),
          ],
          generationConfig: {
            temperature: settings?.temperature ?? 0.7,
            maxOutputTokens: settings?.maxTokens ?? 500,
          },
        }),
      });
      const data = await response.json();
      aiResponse = data.candidates[0].content.parts[0].text;
    } else if (model.includes('claude')) {
      if (!anthropicApiKey) {
        throw new Error('Anthropic API key not configured');
      }
      // Call Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model,
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
      aiResponse = data.content[0].text;
    } else {
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model === 'gpt-4o' ? 'gpt-4' : 'gpt-4-1106-preview',
          messages: [
            { role: 'system', content: systemMessage },
            ...messages
          ],
          temperature: settings?.temperature ?? 0.7,
          max_tokens: settings?.maxTokens ?? 500,
        }),
      });
      const data = await response.json();
      aiResponse = data.choices[0].message.content;
    }

    return new Response(
      JSON.stringify({ content: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in chat-with-ai function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});