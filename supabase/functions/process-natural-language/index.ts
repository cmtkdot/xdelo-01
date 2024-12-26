import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleSqlQuery, handleWebhookAction, handleNLPResponse } from './utils/handlers.ts';
import { detectIntent } from './utils/openai.ts';

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

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Processing message:', message);
    
    const intent = await detectIntent(message, settings, trainingContext, openaiApiKey);
    console.log('Detected intent:', intent);

    let result;
    switch (intent) {
      case 'sql':
        result = await handleSqlQuery(message, settings, trainingContext, openaiApiKey);
        break;
      case 'webhook':
        result = await handleWebhookAction(message, settings, trainingContext, openaiApiKey);
        break;
      case 'nlp':
        result = await handleNLPResponse(message, settings, trainingContext, openaiApiKey);
        break;
      default:
        throw new Error('Invalid intent detected');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in process-natural-language function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});