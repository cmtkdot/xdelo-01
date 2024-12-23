import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleSqlQuery, handleWebhookAction } from './utils/handlers.ts';
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
    
    console.log('Processing natural language query:', message);

    const intent = await detectIntent(message, settings, trainingContext, openaiApiKey);
    console.log('Detected intent:', intent);

    let result;
    if (intent === 'sql') {
      result = await handleSqlQuery(message, settings, trainingContext, openaiApiKey);
    } else if (intent === 'webhook') {
      result = await handleWebhookAction(message, settings, trainingContext, openaiApiKey);
    } else {
      throw new Error('Invalid intent detected');
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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