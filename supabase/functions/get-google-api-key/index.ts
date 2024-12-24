import { serve } from 'https://deno.fresh.dev/server/mod.ts';

serve(async (req) => {
  try {
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not configured');
    }

    return new Response(
      JSON.stringify({ GOOGLE_API_KEY }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});