import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, settings } = await req.json();
    
    // Get API keys based on selected model
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    let response;
    
    if (settings.model.startsWith('claude')) {
      // Claude API call
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: settings.maxTokens,
          messages: [{ role: 'user', content: message }],
          temperature: settings.temperature,
        }),
      });
      
      const data = await response.json();
      return new Response(JSON.stringify({ response: data.content[0].text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } 
    else if (settings.model.startsWith('gemini')) {
      // Gemini API call
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${settings.model}:generateContent?key=${geminiApiKey}`;
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
          generationConfig: {
            temperature: settings.temperature,
            maxOutputTokens: settings.maxTokens,
          },
        }),
      });
      
      const data = await response.json();
      return new Response(JSON.stringify({ 
        response: data.candidates[0].content.parts[0].text 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    else if (settings.model.startsWith('gpt')) {
      // OpenAI API call
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: message }
          ],
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
        }),
      });
      
      const data = await response.json();
      return new Response(JSON.stringify({ 
        response: data.choices[0].message.content 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Unsupported model selected');
  } catch (error) {
    console.error('Error in process-message function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});